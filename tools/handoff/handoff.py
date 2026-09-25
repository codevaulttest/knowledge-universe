"""功能交付页生成器：按 spec 自动点进原型逐屏截图，并生成给开发看的交付页。

用法：
    python3 tools/handoff/handoff.py tools/handoff/specs/<slug>.json --base-url http://localhost:5173

产物：output/handoff/<slug>/index.html + shots/*.png（发布成 Artifact 时 shots/ 作为 files 一起传）。
spec 格式见 .claude/skills/feature-handoff/SKILL.md。
"""
import argparse
import html
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = Path(__file__).with_name('template.html')

# 截图里圈出改动点用的描边，只存在于截图中，不进入原型代码
HIGHLIGHT_CSS = 'outline: 3px solid #FF5A1F !important; outline-offset: 3px !important; border-radius: 6px;'


def locate(page, ref: str):
    """ref 语法：aria:<aria-label> / text:<可见文字> / role:<role>|<name> / css:<selector>"""
    kind, _, value = ref.partition(':')
    if kind == 'aria':
        return page.get_by_label(value, exact=True).first
    if kind == 'text':
        return page.get_by_text(value, exact=False).first
    if kind == 'role':
        role, _, name = value.partition('|')
        return page.get_by_role(role, name=name or None).first
    if kind == 'css':
        return page.locator(value).first
    raise ValueError(f'未知定位写法：{ref}（应为 aria:/text:/role:/css:）')


def run_steps(page, steps):
    for step in steps:
        if 'click' in step:
            locate(page, step['click']).click()
        elif 'fill' in step:
            ref, value = step['fill']
            locate(page, ref).fill(value)
        elif 'scroll' in step:
            locate(page, step['scroll']).scroll_into_view_if_needed()
        elif 'eval' in step:
            page.evaluate(step['eval'])
        if 'wait' in step:
            page.wait_for_timeout(step['wait'])
        else:
            page.wait_for_timeout(350)


def capture(spec, base_url, out_dir: Path):
    shots_dir = out_dir / 'shots'
    shots_dir.mkdir(parents=True, exist_ok=True)
    viewport = spec.get('viewport', {'width': 390, 'height': 844})
    failures = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for screen in spec['screens']:
            # 每屏都从干净的首页开始，保证截图可复现、互不串状态
            context = browser.new_context(viewport=viewport, device_scale_factor=2, locale='zh-CN')
            if spec.get('initScript'):
                # 页面脚本执行前注入（如演示账户的本地存储），保证每屏起点一致
                context.add_init_script(spec['initScript'])
            page = context.new_page()
            page.goto(base_url + spec.get('startPath', '/'), wait_until='networkidle')
            page.wait_for_timeout(600)
            if spec.get('hide'):
                page.add_style_tag(content=','.join(spec['hide']) + '{visibility:hidden !important}')
            try:
                run_steps(page, screen.get('steps', []))
                for ref in screen.get('highlight', []):
                    locate(page, ref).evaluate('(el, css) => el.setAttribute("style", (el.getAttribute("style") || "") + ";" + css)', HIGHLIGHT_CSS)
                page.screenshot(path=str(shots_dir / f"{screen['id']}.png"))
            except Exception as err:  # 某一屏失败不拖垮整份交付，汇总后报告
                failures.append((screen['id'], str(err).splitlines()[0]))
            context.close()
        browser.close()
    return failures


def esc(text: str) -> str:
    return html.escape(text, quote=True)


def render_screen(screen, index):
    path = ''.join(
        f'<li>{esc(node)}</li>' for node in screen.get('path', [])
    )
    changes = ''.join(f'<li>{esc(c)}</li>' for c in screen.get('changes', []))
    dev_notes = screen.get('devNotes', [])
    notes = (
        '<div class="notes"><h4>' + esc(screen.get('notesTitle', '开发注意')) + '</h4><ul>' + ''.join(f'<li>{esc(n)}</li>' for n in dev_notes) + '</ul></div>'
        if dev_notes else ''
    )
    tag = screen.get('tag', '')
    tag_html = f'<span class="tag tag--{esc(tag)}">{esc({"new": "新增", "changed": "改动", "removed": "移除"}.get(tag, tag))}</span>' if tag else ''
    return f'''
    <article class="screen" id="{esc(screen['id'])}">
      <figure class="phone"><img src="shots/{esc(screen['id'])}.png" alt="{esc(screen['title'])} 截图" loading="lazy" width="390" height="844"></figure>
      <div class="screen-body">
        <p class="screen-index">屏 {index}</p>
        <h3>{esc(screen['title'])}{tag_html}</h3>
        {f'<ol class="path" aria-label="入口路径">{path}</ol>' if path else ''}
        <ul class="changes">{changes}</ul>
        {notes}
      </div>
    </article>'''


def build_page(spec, out_dir: Path):
    screens_html = ''.join(render_screen(s, i + 1) for i, s in enumerate(spec['screens']))
    toc = ''.join(f'<li><a href="#{esc(s["id"])}">{esc(s["title"])}</a></li>' for s in spec['screens'])
    meta = spec.get('meta', {})
    meta_html = ''.join(f'<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in meta.items())
    page = TEMPLATE.read_text(encoding='utf-8')
    for key, value in {
        '{{TITLE}}': esc(spec['feature']),
        '{{FEATURE}}': esc(spec['feature']),
        '{{INTRO}}': esc(spec.get('intro', '')),
        '{{META}}': meta_html,
        '{{TOC}}': toc,
        '{{SCREENS}}': screens_html,
        # 页脚说明：截图来源不是原型时（如正式代码 + 模拟接口）由 spec 覆盖
        '{{FOOTER}}': esc(spec.get('footer', '截图由脚本从原型自动生成，橙色描边标出本次改动的位置。原型数据全部为本地演示数据。')),
    }.items():
        page = page.replace(key, value)
    (out_dir / 'index.html').write_text(page, encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('spec')
    parser.add_argument('--base-url', default='http://localhost:5173')
    parser.add_argument('--skip-capture', action='store_true', help='只重建页面，沿用已有截图')
    args = parser.parse_args()

    spec = json.loads(Path(args.spec).read_text(encoding='utf-8'))
    out_dir = ROOT / 'output' / 'handoff' / spec['slug']
    out_dir.mkdir(parents=True, exist_ok=True)

    failures = [] if args.skip_capture else capture(spec, args.base_url.rstrip('/'), out_dir)
    build_page(spec, out_dir)

    print(f'交付页：{out_dir / "index.html"}')
    if failures:
        print('以下屏截图失败：')
        for sid, msg in failures:
            print(f'  {sid}: {msg}')
        sys.exit(1)


if __name__ == '__main__':
    main()
