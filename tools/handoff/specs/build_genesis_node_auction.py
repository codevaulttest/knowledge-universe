"""生成创世节点竞拍交付页的 spec：截图时用 genesis-node-auction.mock.js 模拟 4 个竞拍接口。

用法：python3 tools/handoff/specs/build_genesis_node_auction.py，产物为同目录的 genesis-node-auction.json。
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

USER_STORE = json.dumps({'userInfo': {'purseDtos': [
    {'id': 183, 'pursename': 'PB', 'balance': 943996, 'freeze': 0, 'usableBalance': 943996, 'pursetype': 101},
]}}, ensure_ascii=False)
INIT = (
    'try { if (!localStorage.getItem("web3_genesis_node_user_local_store")) '
    f'localStorage.setItem("web3_genesis_node_user_local_store", {json.dumps(USER_STORE, ensure_ascii=False)}); }} catch (e) {{}}\n'
    + (HERE / 'genesis-node-auction.mock.js').read_text(encoding='utf-8')
)

CLOSE_POPUP = (
    "new Promise(r => { let n = 0; const t = setInterval(() => { const b = document.querySelector('button[aria-label=close]'); "
    "if (b) { b.click(); clearInterval(t); setTimeout(r, 600); } else if (++n > 20) { clearInterval(t); r(); } }, 150); })"
)


# 竞拍组件全部用 UnoCSS utility，没有专用 class，按结构定位
ENTRY = r'css:button:has(.i-fa6-solid\:gavel)'
TABS = 'css:div.grid-cols-2:has(> button)'
ROUND_BAR = 'css:div.relative.z-10.items-end'
GROUP_TITLE = 'css:div.px-1.text-3.font-600'
HISTORY_MINE = 'css:div.text-gn-auction.font-600.border-b-1'


def start(phase, enter=True):
    steps = [
        {'eval': f"localStorage.setItem('handoff_phase', '{phase}'); setTimeout(() => location.reload(), 0)", 'wait': 3000},
        {'eval': CLOSE_POPUP, 'wait': 300},
    ]
    if enter:
        steps.append({'click': ENTRY, 'wait': 1800})
    return steps


def click_card(pattern, action=False):
    target = ".querySelector(':scope > div:last-child > button')" if action else ''
    return {'eval': f"[...document.querySelectorAll('.gn-auction-card')].find(c => /{pattern}/.test(c.textContent)){target}.click()", 'wait': 1800}


NOTES = '接口与待确认'

screens = [
    {
        'id': 'entry', 'title': '知识宇宙页的竞拍入口', 'tag': 'new', 'path': ['知识宇宙页', '资产卡下方'],
        'steps': start('live', enter=False), 'highlight': [ENTRY],
        'changes': [
            '入口卡在知识宇宙页资产卡下方，点击进入竞拍列表',
            '副标题下方是本期结束倒计时',
            '副标题是本期在拍节点数，其中还没有人出价的单独点出来',
            '自己有参与时追加一行：出价领先几场、出价被超过几场；有被超过的场次时转红色',
        ],
        'devNotes': [
            'GetZsAuctionSummary：totalNum → 在拍数，localNum → 无人出价数，endTime → 倒计时；leadingCount / outbidCount → 我领先、被超过的场数',
        ],
    },
    {
        'id': 'list', 'title': '竞拍列表', 'tag': 'new', 'path': ['知识宇宙页', '创世节点竞拍'],
        'steps': start('live'), 'highlight': [TABS, ROUND_BAR],
        'changes': [
            '顶部深金头图里是本期状态（竞拍中或开拍时间）和倒计时，右侧是「竞拍规则」入口；两个分段下都显示',
            '下面分「本期竞拍（N）」和「上期结果」两段',
            '自己参与的场次置顶，分「我参与的（N）」和「其他场次（N）」',
            '我参与的里被超过的排最前；其他场次按上月排名，一期内顺序固定，价格刷新时卡片不跳',
            '本期其他场次标题右侧有「还没有人出价」筛选（竞拍中且已有场次被出价时才出现）和「价格从低到高」排序，场次数随筛选变化',
            '每行三行：席位号与状态徽章（竞拍中且我没出价时不显示徽章）、上月名次与空投、当前价或起拍价与按钮',
            '行右侧按钮按我的状态变化：出价（浅金底，我没参与）、继续加价（白底描边，我领先）、立即加价（实心金色，已被超过）；点整行进详情',
            '我领先的行是浅蓝底，已被超过的行是浅红底；当前价上涨时价格闪一下并显示涨了多少',
            '停留在页面时自动刷新，切回前台时也刷新',
        ],
        'devNotes': [
            'GetZsAuctionList：thirdCode → 节点编号，beginPrice → 起拍价，addPrice → 最低加价，localPrice → 当前价，times → 出价次数，status → 我的状态',
            '席位号取 fromInfo 里的「#数字」，上月名次和空投取 note 里的「第N名」「空投N」；格式改动需提前告知',
            'status：-1 与我无关 / 1 即将开拍 / 2 我领先 / 3 已被超过 / 4 我已拍得 / 5 未拍得',
        ],
    },
    {
        'id': 'bid-sheet', 'title': '出价页', 'tag': 'new', 'path': ['竞拍列表', '某一场的出价按钮'],
        'steps': start('live') + [click_card('创世 #25', action=True)], 'highlight': ['css:.stake-code-stepper'],
        'changes': [
            '独立页面，从列表或详情的出价按钮进入；确认出价按钮紧跟在表单下方，出价成功后返回上一页',
            '立即加价与确认出价为实心金色；我没参与的出价为浅金底；我领先时的继续加价为白底棕色描边',
            '标题是「为创世 #N 出价」，上方显示当前价或起拍价，以及已出价次数与下次出价至少多少',
            '金额按一万步进，另有 +10,000 / +50,000 / +100,000 三个快捷加价',
            '只用站内 PB 出价，快捷加价下方显示可用余额；余额不足时提示还差多少并禁用按钮',
            '低于最低出价时出红字提示；别人抢先加价后只提示新的最低价，已输入的金额不变',
            '自己已领先时顶部提示：上一笔先退回再冻结新出价；余额是否够按「余额 + 上一笔」计算',
        ],
        'devNotes': [
            'BidZsAuction 传 infoId、amount；只扣站内 PB（purseDtos 中 id=183）',
            '出价失败统一显示后端 message，并刷新价格和余额',
        ],
    },
    {
        'id': 'bid-done', 'title': '出价成功后的列表', 'tag': 'new', 'path': ['出价页', '确认出价'],
        'steps': start('live') + [click_card('创世 #25', action=True), {'click': 'text:确认出价', 'wait': 2500}],
        'highlight': ['css:.gn-auction-card:has-text("创世 #25")'],
        'changes': [
            '出价成功后弹出提示，说明冻结金额；覆盖自己上一笔出价时一并说明上一笔已退回（提示已消失，截图中未显示）',
            '刚出价的那一行移到「我参与的」，转成「我领先」，按钮变为「继续加价」',
        ],
        'devNotes': ['出价成功后前端重新拉取摘要、列表、出价记录和余额'],
    },
    {
        'id': 'detail', 'title': '竞拍详情', 'tag': 'new', 'path': ['竞拍列表', '点击整行'],
        'steps': start('live') + [click_card('已被超过')], 'highlight': [HISTORY_MINE],
        'changes': [
            '顶部是当前价与倒计时，下面是上月名次、上月空投额度',
            '有人出价后单独列出起拍价',
            '出价记录里自己的那行高亮并标「我」，已被超过的追加「已退回」',
            '底部固定金色按钮：出价 / 继续加价（我领先）/ 尚未开拍；期次结束后隐藏',
        ],
        'devNotes': [
            'GetZsAuctionBidHistory：createTime、localPrice、status（0 已退回 / 1 竞拍中 / 2 竞拍成功）、addr（脱敏）、isMine',
            '直接打开或刷新详情页时，先拉摘要和列表再按 infoId 找到该场，不需要单独的详情接口',
        ],
    },
    {
        'id': 'previous-list', 'title': '上期结果列表', 'tag': 'new', 'path': ['竞拍列表', '上期结果'],
        'steps': start('live') + [{'click': 'text:上期结果', 'wait': 900}], 'highlight': [GROUP_TITLE],
        'changes': [
            '同样分「我参与的（N）」和「其他场次」',
            '自己参与过的场次标「我已拍得」或「未拍得」，其余场次标「已成交」或「无人出价」',
            '每行显示名次与空投额度、成交价；无人出价的显示起拍价',
            '行右侧统一是「查看结果」，点击进入该场详情',
        ],
        'devNotes': ['上期列表用摘要的 oldConfigId 拉取；addr 为拍得人，我拍得时为「我」'],
    },
    {
        'id': 'settled', 'title': '上期结果详情', 'tag': 'new', 'path': ['竞拍列表', '上期结果', '某一场'],
        'steps': start('live') + [{'click': 'text:上期结果', 'wait': 900}, click_card('我已拍得')],
        'changes': [
            '结算信息列出成交价与拍得人，拍得人是自己时显示「我」',
            '无人出价的场次显示「本场无人出价」',
        ],
    },
    {
        'id': 'settling', 'title': '期次刚结束：结果统计中', 'tag': 'new', 'path': ['竞拍列表', '点击整行'],
        'steps': start('settling') + [click_card('我已拍得|未拍得|结果统计中')],
        'changes': [
            '期次结束后不能再出价，底部出价按钮隐藏',
            '接口返回结算结果之前，列表徽章和详情页显示「结果统计中」，详情页提示「成交结果统计中，几分钟后更新」',
            '结算完成后自动显示成交价与拍得人',
        ],
        'devNotes': [
            '结算完成前本期列表仍返回 2 / 3，结算后变为 4 / 5；前端以此判断是否还在统计',
            '上期列表里有人出价但 addr 为空时，同样按统计中处理',
        ],
    },
    {
        'id': 'rules', 'title': '竞拍规则说明', 'tag': 'new', 'path': ['竞拍列表', '规则'],
        'steps': start('live') + [{'click': 'css:button:has(> .i-lucide\\:info)', 'wait': 1000}],
        'changes': ['四条规则：末 50 名进入竞拍、起拍价构成与最低加价、冻结与退回到站内 PB 余额、节点被竞拍时你获得的金额'],
    },
    {
        'id': 'load-failed', 'title': '加载失败', 'tag': 'new', 'path': ['知识宇宙页', '创世节点竞拍'],
        'steps': start('live') + [{'eval': "(() => { const s = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('web3_genesis_node_auction_local_store'); s.set_item('attemptedAt', Date.now() + 600000); s.set_item('lots', []); s.set_item('failed', true); })()", 'wait': 800}],
        'changes': [
            '一次都没拉到数据时显示「竞拍信息没有加载出来」和「重试」',
            '已经有数据时拉取失败不打断页面，继续显示上次的数据并自动重试',
        ],
    },
    {
        'id': 'none', 'title': '还没有任何一期：入口卡隐藏', 'tag': 'new', 'path': ['知识宇宙页'],
        'steps': start('none', enter=False),
        'changes': ['第一期名单公布之前，知识宇宙页不显示竞拍入口卡'],
        'devNotes': ['GetZsAuctionSummary 返回 data 为 null 时入口卡隐藏'],
    },
    {
        'id': 'first-upcoming-entry', 'title': '第一期开拍前：入口卡', 'tag': 'new', 'path': ['知识宇宙页', '资产卡下方'],
        'steps': start('first-upcoming', enter=False), 'highlight': [ENTRY],
        'changes': [
            '名单公布后、开拍前，入口卡显示「本期 N 个创世节点即将开拍」',
            '倒计时改为距开拍',
        ],
        'devNotes': ['没有进行中的期次时，下一期从 nextConfig 读取（configId、fromTime、endTime）'],
    },
    {
        'id': 'first-upcoming-list', 'title': '第一期开拍前：竞拍列表', 'tag': 'new', 'path': ['知识宇宙页', '创世节点竞拍'],
        'steps': start('first-upcoming'), 'highlight': [ROUND_BAR],
        'changes': [
            '没有上一期，所以不显示分段，只列出本期节点',
            '顶部状态条显示「本期 N 个创世节点」和开拍时间：超过一天显示具体开拍日期时间，一天内显示倒计时',
            '每场显示起拍价，徽章为「即将开拍」，按钮为「查看详情」；详情页底部按钮为不可点的「尚未开拍」',
        ],
    },
    {
        'id': 'between-entry', 'title': '两期之间：入口卡', 'tag': 'new', 'path': ['知识宇宙页', '资产卡下方'],
        'steps': start('between', enter=False), 'highlight': [ENTRY],
        'changes': [
            '一期结束后、下期名单公布前，入口卡保留，文案为「上期竞拍已结束，可查看成交结果」',
            '拍得节点的人追加一行「你拍得了 N 个创世节点」',
            '这段时间没有倒计时',
        ],
        'devNotes': ['configId 为 0、oldConfigId 有值、没有 nextConfig 时进入这一阶段'],
    },
    {
        'id': 'between-list', 'title': '两期之间：竞拍列表', 'tag': 'new', 'path': ['知识宇宙页', '创世节点竞拍'],
        'steps': start('between'), 'highlight': [GROUP_TITLE],
        'changes': [
            '没有本期，所以不显示分段，直接展示上期结果',
            '自己参与过的场次置顶，徽章为「我已拍得」或「未拍得」',
        ],
    },
    {
        'id': 'next-upcoming-list', 'title': '下期名单已公布、尚未开拍：竞拍列表', 'tag': 'new', 'path': ['知识宇宙页', '创世节点竞拍'],
        'steps': start('next-upcoming'), 'highlight': [TABS, ROUND_BAR],
        'changes': [
            '下期名单公布后，入口卡同第一期开拍前，显示即将开拍和距开拍倒计时',
            '列表恢复分段：第一段为「即将开拍（N）」，第二段为「上期结果」',
        ],
    },
]
# 字段对照、状态取值、时间与刷新规则只写在接口契约里，交付页不重复
for screen in screens:
    screen.pop('devNotes', None)

spec = {
    'slug': 'genesis-node-auction',
    'feature': '创世节点竞拍',
    'footer': '截图由脚本从 wujie_mono 正式代码的本地开发环境自动生成，橙色描边标出本次改动的位置。接口数据为截图用的模拟数据。',
    'intro': (
        '每月排名末 50 名的创世节点在次月公开竞拍，出价最高者获得节点。本页只展示各页面和各阶段的样子；'
        '接口字段、状态取值和规则见接口契约。开发环境目前只有即将开拍的测试数据，为了展示各阶段，'
        '截图时模拟了接口返回，页面代码与联调时相同。'
    ),
    'meta': {
        '代码位置': 'wujie_mono · apps/web3/genesis_node',
        '分支': 'feat/genesis-node-auction（MR !53，提交 b879f418）',
        '日期': '2026-09-25',
        '接口契约': 'https://claude.ai/artifact/Cs6dsAJY8HjmTL6hZoLeuq（字段、状态、竞拍时间、结算与刷新规则以此为准）',
        '涉及页面': '知识宇宙页 · 竞拍列表 · 竞拍详情 · 出价页 · 规则弹窗',
    },
    'startPath': '/web3_genesis_node/planet',
    'initScript': INIT,
    'screens': screens,
}

(HERE / 'genesis-node-auction.json').write_text(json.dumps(spec, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('spec written')
