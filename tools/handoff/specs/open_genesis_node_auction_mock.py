"""用截图模拟数据打开可操作的创世节点竞拍页面（需先启动 genesis_node 开发服务器）。

直接运行会列出所有状态供选择：python3 tools/handoff/specs/open_genesis_node_auction_mock.py
也可以带编号或状态名：python3 tools/handoff/specs/open_genesis_node_auction_mock.py 2
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
BASE_URL = 'http://localhost:53369'

# (阶段, 是否有我的出价, 说明)
SCENES = [
    ('live', True, '竞拍中，我有领先和被超过的场次（有上期）'),
    ('live', False, '竞拍中，我还没参与（有上期）'),
    ('first-live', True, '第一期竞拍中，我有出价（没有上期）'),
    ('first-live', False, '第一期竞拍中，我还没参与（没有上期）'),
    ('first-upcoming', True, '第一期即将开拍（没有上期）'),
    ('next-upcoming', True, '下一期即将开拍（有上期）'),
    ('settling', True, '本期刚结束，结果统计中'),
    ('between', True, '两期之间，只有上期结果'),
    ('none', True, '还没有任何竞拍'),
]


def pick():
    arg = sys.argv[1] if len(sys.argv) > 1 else ''
    if arg.isdigit() and 1 <= int(arg) <= len(SCENES):
        return SCENES[int(arg) - 1]
    for scene in SCENES:
        if arg == scene[0]:
            return (scene[0], 'nomine' not in sys.argv, scene[2])
    for i, (_, _, label) in enumerate(SCENES, 1):
        print(f'{i}. {label}')
    choice = input('输入编号：').strip()
    return SCENES[int(choice) - 1]


def main():
    phase, mine, label = pick()
    spec = json.loads((HERE / 'genesis-node-auction.json').read_text(encoding='utf-8'))
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
        context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        context.add_init_script(
            f"localStorage.setItem('handoff_phase', {json.dumps(phase)}); "
            f"localStorage.setItem('handoff_mine', {json.dumps('1' if mine else '0')});"
        )
        context.add_init_script(spec['initScript'])
        page = context.new_page()
        page.goto(BASE_URL + spec['startPath'])
        print(f'已打开：{label}。关闭浏览器窗口即结束。', flush=True)
        page.wait_for_event('close', timeout=0)
        browser.close()


if __name__ == '__main__':
    main()
