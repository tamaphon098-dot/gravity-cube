// Browser demo stages: the first stage of 普通 / 難しい / 達人 / 名人, same boards, texts and par as the app
// (Tools/stages_v5.json, Source/GravityShift/GSStageData.inl, Tools/loc/en.json).
window.STAGES = [
  { id: 'N01', tier: { ja: '普通', en: 'Normal' }, title: { ja: '二つの停車駅', en: 'Two Stops' }, par: 5,
    rows: ['....#..', '.......', 'o.#..#.', '...#C.#', '.#.#.o.', 'T.#....'],
    obj: { ja: '紫の◎（ストッパー）で途中停車して「A」へ', en: 'Stop partway on a purple ◎ (stopper), then reach "A"' },
    rule: { ja: "紫の◎：ここに入ったキューブは、滑るのをやめてピタッと止まる", en: "Purple ◎: a cube that slides into it stops right there" },
    h1: { ja: '◎はキューブを途中で止められる場所。どの◎で止めれば次の一手が生きる？', en: 'A ◎ lets you stop a cube partway. Which ◎ sets up your next move?' } },
  { id: 'H01', tier: { ja: '難しい', en: 'Hard' }, title: { ja: '二本の矢印', en: 'Two Arrows' }, par: 8,
    rows: ['.......', '.##...T', '#...##.', '.#..#..', '.....v.', 'C.^...C'],
    obj: { ja: '緑の矢印（一方通行）の向きを読んで「A」へ', en: 'Read the green one-way arrows and reach "A"' },
    rule: { ja: "緑の矢印：通り抜け専用のマス。中では止まれない。矢印と同じ向きに滑るキューブだけが通り抜ける。他の向きから来ると、マスの手前で止まる\nキューブ同士もぶつかる：先に止まったキューブが、後から来たキューブの壁になる", en: "Green arrow: pass-through square. Nothing can stop inside it. Only a cube sliding the way the arrow points passes through; from any other direction it stops just before the square\nCubes hit each other too: a cube that has stopped becomes a wall for the next one" },
    h1: { ja: '近道に見える手が正解とは限らない。矢印のマスは一方通行。逆向きに来たキューブには壁と同じになる。', en: "A move that looks like a shortcut isn't always right. Arrow squares are one-way: from the wrong side they're a wall." } },
  { id: 'E01', tier: { ja: '達人', en: 'Expert' }, title: { ja: '直交', en: 'Crossroads' }, par: 10,
    rows: ['..#....', '.......', '.......', '.#.V#.#', 'H..C<.#', '.T.....'],
    obj: { ja: '緑の矢印（一方通行）の向きを読んで「A」へ', en: 'Read the green one-way arrows and reach "A"' },
    rule: { ja: "緑の矢印：通り抜け専用のマス。中では止まれない。矢印と同じ向きに滑るキューブだけが通り抜ける。他の向きから来ると、マスの手前で止まる\nオレンジの箱：金色のレールの線に沿ってしか動かない。線と違う向きの重力では動かず、壁の代わりになる", en: "Green arrow: pass-through square. Nothing can stop inside it. Only a cube sliding the way the arrow points passes through; from any other direction it stops just before the square\nOrange box: moves only along its gold rail line. When gravity points another way it stays put and acts as a wall" },
    h1: { ja: '矢印のマスは一方通行。逆向きに来たキューブには壁と同じになる。', en: "Arrow squares are one-way: from the wrong side they're a wall." } },
  { id: 'M01', tier: { ja: '名人', en: 'Master' }, title: { ja: '遠回りの正解', en: 'The Long Way' }, par: 15,
    rows: ['T...#..', '.#..T#.', '.......', '...#...', '.#..#..', '..CC#..'],
    obj: { ja: '「A」と「B」の2か所に、キューブを1つずつ止めよう', en: 'Stop one cube each on "A" and "B"' },
    rule: { ja: "キューブ同士もぶつかる：先に止まったキューブが、後から来たキューブの壁になる", en: "Cubes hit each other too: a cube that has stopped becomes a wall for the next one" },
    h1: { ja: '枠に近づける手が正解とは限らない。一度わざと遠ざける場面がある。キューブ同士もぶつかって止まる。片方を壁代わりにしよう。', en: "Moving a cube toward the frame isn't always right: once you must move it away on purpose. Cubes stop against each other too." } },
];
