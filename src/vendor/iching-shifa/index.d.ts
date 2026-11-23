export declare const BAGUA_XIANG: {
    readonly "1": "天";
    readonly "2": "泽";
    readonly "3": "火";
    readonly "4": "雷";
    readonly "5": "风";
    readonly "6": "水";
    readonly "7": "山";
    readonly "8": "地";
};

/** 八卦名称 */
export declare type BaguaName = '乾' | '坎' | '坤' | '离' | '震' | '艮' | '巽' | '兑';

/**
 * 提取青衣页面的星宿推排算法。
 * @param yaoString 六爻字符串，支持本库 6/7/8/9 格式，也支持青衣 0/1 格式
 * @param diZhiList 可选爻支列表，按初爻到上爻排序；传入后会同时计算锁泊
 * @returns 青衣星宿推排结果
 */
export declare function calculateQingyiXingXiu(yaoString: YaoString, diZhiList?: readonly string[]): QingyiXingXiuResult;

/**
 * 计算旬空
 */
export declare function calcXunKong(dayGZ: string): string;

/**
 * 统计动爻数量
 */
export declare function countMovingYao(yaoString: YaoString): number;

/**
 * 大衍筮法 - 模拟蓍草起卦
 * 返回6位爻字符串（6/7/8/9）
 */
export declare function dayan(): YaoString;

/**
 * 解码单个卦的纳甲。
 * @param yaoString 六爻字符串，从初爻到上爻
 * @param dayGanZhi 日干支，用于排六兽
 * @param isZhiGua 是否按之卦处理；传入含动爻的本卦爻串时会先变出之卦
 * @param includeNaYin 是否输出纳音
 * @param liuQinPalaceWuXing 六亲计算所用的宫五行；传入已变静爻串时需用它指定本卦宫五行
 * @returns 单卦排盘结果
 */
export declare function decodeGua(yaoString: YaoString, dayGanZhi: string, isZhiGua?: boolean, includeNaYin?: boolean, liuQinPalaceWuXing?: WuXing): GuaPan;

/**
 * 完整排盘
 */
export declare function decodePan(yaoString: YaoString, options: DivinationOptions): PanResult;

export declare const DI_ZHI: readonly ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

/** 起卦选项 */
export declare interface DivinationOptions {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute?: number;
}

/** 伏神数据 */
export declare interface FuShenData {
    fuLiuQin: LiuQin;
    fuNaJia: string;
    fuNaYin: string;
    fuWuXing: WuXing;
    hostPosition: number;
}

/** 干支对象 */
export declare interface GanZhi {
    tian: string;
    di: string;
    gz: string;
}

/**
 * 获取干支的五行
 */
export declare function ganZhiToWuXing(ganOrZhi: string): WuXing;

/** 高岛易断单卦条目 */
export declare interface GaoDaoYiDuanEntry {
    /** 简称卦名，如"乾""泰" */
    guaName: string;
    /** 卦体与义理阐释 */
    intro: string;
    /** 逐爻详解，按爻位1-6排序，不含用九/用六 */
    lines: GaoDaoYiDuanLine[];
}

/** 高岛易断单条爻的详解 */
export declare interface GaoDaoYiDuanLine {
    /** 爻位，1 为初爻，6 为上爻；不含用九/用六 */
    line: number;
    /** 爻辞，如"初九：潜龙勿用。" */
    title: string;
    /** 象辞 */
    xiang: string;
    /** 逐句详解 */
    commentary: string;
}

/** 高岛易断解读结果（精简版：本卦总论 + 动爻详解） */
export declare interface GaoDaoYiDuanResult {
    /** 命中的卦名 */
    guaName: string;
    /** 本卦总论：卦体与义理阐释 */
    intro: string;
    /** 动爻详解，按爻位从初爻到上爻排序；无动爻时为空数组 */
    movingLines: GaoDaoYiDuanLine[];
}

/**
 * 获取当前节气
 */
export declare function getCurrentSolarTerm(year: number, month: number, day: number): string;

/**
 * 根据爻串查询《高岛易断》解读。
 * @param yaoString 六爻字符串，可包含动爻(6/9)
 * @returns 命中卦名对应的总论与动爻详解；卦名未收录时返回 undefined
 */
export declare function getGaoDaoYiDuan(yaoString: YaoString): GaoDaoYiDuanResult | undefined;

/**
 * 查找卦名
 */
export declare function getGuaName(yaoString: YaoString): string;

/**
 * 五鼠遁：根据日干推算时干支
 */
export declare function getHourGanZhi(dayGZ: string, hour: number): GanZhi;

/**
 * 计算互卦
 * 取本卦2-4爻为下卦，3-5爻为上卦
 */
export declare function getHuGua(yaoString: YaoString): YaoString;

/**
 * 获取动爻位置（1-6）
 */
export declare function getMovingYaoPositions(yaoString: YaoString): number[];

/**
 * 查询干支纳音
 */
export declare function getNaYin(ganZhi: string): string | undefined;

/**
 * 按青衣锁泊表计算单爻锁泊。
 * @param diZhi 爻支，如“子”“丑”
 * @param xingXiu 星宿全称，如“柳土獐”
 * @returns 锁泊字；参数不在表中时返回空字符串
 */
export declare function getQingyiSuoBo(diZhi: string, xingXiu: string): string;

/**
 * 获取五行生克关系（从宫的视角）
 * @param yaoWx 爻的五行
 * @param gongWx 宫的五行
 * @returns 关系描述（从宫的视角）
 */
export declare function getWuXingRelation(yaoWx: WuXing, gongWx: WuXing): WuXingRelation;

/**
 * 计算之卦（变卦）
 * 老阳(9)变少阴(8)，老阴(6)变少阳(7)
 */
export declare function getZhiGua(yaoString: YaoString): YaoString;

export declare const GUA64_ORDER: readonly ["乾", "姤", "遯", "否", "观", "剥", "晋", "大有", "震", "豫", "解", "恒", "升", "井", "大过", "随", "坎", "节", "屯", "既济", "革", "丰", "明夷", "师", "艮", "贲", "大畜", "损", "睽", "履", "中孚", "渐", "坤", "复", "临", "泰", "大壮", "夬", "需", "比", "巽", "小畜", "家人", "益", "无妄", "噬嗑", "颐", "蛊", "离", "旅", "鼎", "未济", "蒙", "涣", "讼", "同人", "兑", "困", "萃", "咸", "蹇", "谦", "小过", "归妹"];

export declare const GUA_DESCRIPTIONS: {
    readonly 乾: {
        readonly "0": "乾，本卦。元，亨，利，贞。用九：见群龙无首，吉。";
        readonly "1": "初九：潜龙，勿用。";
        readonly "2": "九二：见龙在田，利见大人。";
        readonly "3": "九三：君子终日乾乾，夕惕若，厉无咎。";
        readonly "4": "九四：或跃在渊，无咎。";
        readonly "5": "九五：飞龙在天，利见大人。";
        readonly "6": "上九：亢龙有悔。";
        readonly "7": "彖︰大哉乾元，万物资始，乃统天。云行雨施，品物流形，大明终始，六位时成，时乘六龙以御天。乾道变化，各正性命，保合大和，乃利贞。首出庶物，万国咸宁。";
    };
    readonly 坤: {
        readonly "0": "坤，元，亨，利牝马之贞。君子有攸往，先迷后得主，利西南得朋，东北丧朋。 安贞，吉。用六：利永贞。";
        readonly "1": "初六：履霜，坚冰至。";
        readonly "2": "六二：直，方，大，不习无不利。";
        readonly "3": "六三：含章可贞。 或从王事，无成有终。";
        readonly "4": "六四：括囊﹔无咎，无誉。";
        readonly "5": "六五：黄裳，元吉。";
        readonly "6": "上六：龙战于野，其血玄黄。";
        readonly "7": "彖︰至哉坤元，万物资生，乃顺承天。坤厚载物，德合无疆，含弘光大，品物咸亨。牝马地类，行地无疆，柔顺利贞。君子攸行，先迷失道，后顺得常。西南得朋，乃与类行。东北丧朋，乃终有庆。安贞之吉，应地无疆。";
    };
    readonly 否: {
        readonly "0": "否之匪人，不利君子贞，大往小来。";
        readonly "1": "初六：拔茅茹，以其夤，贞吉亨。";
        readonly "2": "六二：包承。 小人吉，大人否亨。";
        readonly "3": "六三：包羞。";
        readonly "4": "九四：有命无咎，畴离祉。";
        readonly "5": "九五：休否，大人吉。 其亡其亡，系于苞桑。";
        readonly "6": "上九：倾否，先否后喜。";
        readonly "7": "彖︰否之匪人，不利君子贞，大往小来，则是天地不交而万物不通也，上下不交而天下无邦也。内阴而外阳，内柔而外刚，内小人而外君子。小人道长，君子道消也。";
    };
    readonly 遯: {
        readonly "0": "亨，小利贞。";
        readonly "1": "初六：遯尾，厉，勿用有攸往。";
        readonly "2": "六二：执之用黄牛之革，莫之胜说。";
        readonly "3": "九三：系遯，有疾厉，畜臣妾吉。";
        readonly "4": "九四：好遯君子吉，小人否。";
        readonly "5": "九五：嘉遯，贞吉。";
        readonly "6": "上九：肥遯，无不利。";
        readonly "7": "彖︰遯亨，遯而亨也。刚当位而应，与时行也。小利贞，浸而长也。遯之时义大矣哉。";
    };
    readonly 讼: {
        readonly "0": "有孚，窒。 惕中吉。 终凶。 利见大人，不利涉大川。";
        readonly "1": "初六：不永所事，小有言，终吉。";
        readonly "2": "九二：不克讼，归而逋，其邑人三百户，无眚。";
        readonly "3": "六三：食旧德，贞厉，终吉，或从王事，无成。";
        readonly "4": "九四：不克讼，复自命，渝安贞，吉。";
        readonly "5": "九五：讼元吉。";
        readonly "6": "上九：或锡之鞶带，终朝三褫之。";
        readonly "7": "彖︰讼，上刚下险，险而健，讼。讼有孚，窒惕，中吉，刚来而得中也。终凶，讼不可成也。利见大人，尚中正也。不利涉大川，入于渊也。";
    };
    readonly 姤: {
        readonly "0": "女壮，勿用取女。";
        readonly "1": "初六：系于金柅，贞吉，有攸往，见凶，羸豕孚踟躅。";
        readonly "2": "九二：包有鱼，无咎，不利宾。";
        readonly "3": "九三：臀无肤，其行次且，厉，无大咎。";
        readonly "4": "九四：包无鱼，起凶。";
        readonly "5": "九五：以杞包瓜，含章，有陨自天。";
        readonly "6": "上九：姤 其角，吝，无咎。";
        readonly "7": "彖︰姤，遇也，柔遇刚也。勿用取女，不可与长也。天地相遇，品物咸章也；刚遇中正，天下大行也，姤之时义大矣哉。";
    };
    readonly 无妄: {
        readonly "0": "元，亨，利，贞。 其匪正有眚，不利有攸往。";
        readonly "1": "初九：无妄，往吉。";
        readonly "2": "六二：不耕获，不菑畬，则利有攸往。";
        readonly "3": "六三：无妄之灾，或系之牛，行人之得，邑人之灾。";
        readonly "4": "九四：可贞，无咎。";
        readonly "5": "九五：无妄之疾，勿药有喜。";
        readonly "6": "上九：无妄，行有眚，无攸利。";
        readonly "7": "彖︰无妄，刚自外来而为主于内，动而健，刚中而应，大亨以正，天之命也，其匪正有眚，不利有攸往。无妄之往，何之矣。天命不祐，行矣哉。";
    };
    readonly 同人: {
        readonly "0": "同人于野，亨。 利涉大川，利君子贞。";
        readonly "1": "初九：同人于门，无咎。";
        readonly "2": "六二：同人于宗，吝。";
        readonly "3": "九三：伏戎于莽，升其高陵，三岁不兴。";
        readonly "4": "九四：乘其墉，弗克攻，吉。";
        readonly "5": "九五：同人，先号啕而后笑。 大师克相遇。";
        readonly "6": "上九：同人于郊，无悔。";
        readonly "7": "彖︰同人，柔得位得中而应乎乾，曰同人。同人曰，同人于野，亨，利涉大川，乾行也。文明以健，中正而应，君子正也，唯君子为能通天下之志。";
    };
    readonly 履: {
        readonly "0": "履虎尾，不咥人，亨。";
        readonly "1": "初九：素履，往无咎。";
        readonly "2": "九二：履道坦坦，幽人贞吉。";
        readonly "3": "六三：眇能视，跛能履，履虎尾，咥人，凶。 武人为于大君。";
        readonly "4": "九四：履虎尾，愬愬终吉。";
        readonly "5": "九五：夬履，贞厉。";
        readonly "6": "上九：视履考祥，其旋元吉。";
        readonly "7": "彖︰履，柔履刚也。说而应乎乾，是以履虎尾，不咥人，亨。刚中正，履帝位而不疚，光明也。";
    };
    readonly 兑: {
        readonly "0": "亨，利贞。";
        readonly "1": "初九：和兑，吉。";
        readonly "2": "九二：孚兑，吉，悔亡。";
        readonly "3": "六三：来兑，凶。";
        readonly "4": "九四：商兑，未宁，介疾有喜。";
        readonly "5": "九五：孚于剥，有厉。";
        readonly "6": "上六：引兑。";
        readonly "7": "彖︰兑，说也。刚中而柔外，说以利贞，是以顺乎天而应乎人。说以先民，民忘其劳，说以犯难，民忘其死，说之大，民劝矣哉。";
    };
    readonly 萃: {
        readonly "0": "亨。 王假有庙，利见大人，亨，利贞。 用大牲吉，利有攸往。";
        readonly "1": "初六：有孚不终，乃乱乃萃，若号一握为笑，勿恤，往无咎。";
        readonly "2": "六二：引吉，无咎，孚乃利用禴。";
        readonly "3": "六三：萃如，嗟如，无攸利，往无咎，小吝。";
        readonly "4": "九四：大吉，无咎。";
        readonly "5": "九五：萃有位，无咎。 匪孚，元永贞，悔亡。";
        readonly "6": "上六：赍咨涕洟，无咎。";
        readonly "7": "彖︰萃，聚也。顺以说，刚中而应，故聚也。王假有庙，致孝享也；利见大人，亨，聚以正也；用大牲，吉，利有攸往，顺天命也。观其所聚，而天地万物之情可见矣。";
    };
    readonly 咸: {
        readonly "0": "亨，利贞，取女吉。";
        readonly "1": "初六：咸其拇。";
        readonly "2": "六二：咸其腓，凶，居吉。";
        readonly "3": "九三：咸其股，执其随，往吝。";
        readonly "4": "九四：贞吉悔亡，憧憧往来，朋从尔思。";
        readonly "5": "九五：咸其脢，无悔。";
        readonly "6": "上六：咸其辅，颊，舌。";
        readonly "7": "彖︰咸，感也。柔上而刚下，二气感应以相与，止而说，男下女，是以亨，利贞，取女吉也。天地感而万物化生，圣人感人心而天下和平。观其所感，而天地万物之情可见矣。";
    };
    readonly 困: {
        readonly "0": "亨，贞，大人吉，无咎，有言不信。";
        readonly "1": "初六：臀困于株木，入于幽谷，三岁不见。";
        readonly "2": "九二：困于酒食，朱绂方来，利用亨祀，征凶，无咎。";
        readonly "3": "六三：困于石，据于蒺藜，入于其宫，不见其妻，凶。";
        readonly "4": "九四：来徐徐，困于金车，吝，有终。";
        readonly "5": "九五：劓刖，困于赤绂，乃徐有说，利用祭祀。";
        readonly "6": "上六：困于葛藟，于臲卼，曰动悔。 有悔，征吉。";
        readonly "7": "彖︰困，刚揜也。险以说，困而不失其所亨，其唯君子乎。贞大人吉，以刚中也；有言不信，尚口乃穷也。";
    };
    readonly 大过: {
        readonly "0": "栋桡，利有攸往，亨。";
        readonly "1": "初六：藉用白茅，无咎。";
        readonly "2": "九二：枯杨生稊，老夫得其女妻，无不利。";
        readonly "3": "九三：栋桡，凶。";
        readonly "4": "九四：栋隆，吉﹔有它吝。";
        readonly "5": "九五：枯杨生华，老妇得士夫，无咎无誉。";
        readonly "6": "上六：过涉灭顶，凶，无咎。";
        readonly "7": "彖︰大过，大者过也。栋桡，本末弱也。刚过而中，巽而说行，利有攸往，乃亨，大过之时大矣哉。";
    };
    readonly 随: {
        readonly "0": "元亨利贞，无咎。";
        readonly "1": "初九：官有渝，贞吉。 出门交有功。";
        readonly "2": "六二：系小子，失丈夫。";
        readonly "3": "六三：系丈夫，失小子， 随有求得，利居贞。";
        readonly "4": "九四：随有获，贞凶，有孚在道，以明，何咎。";
        readonly "5": "九五：孚于嘉，吉。";
        readonly "6": "上六：拘系之，乃从维之。 王用亨于西山。";
        readonly "7": "彖︰随，刚来而下柔，动而说，随。大亨贞，无咎，而天下随时，随时之义大矣哉！";
    };
    readonly 革: {
        readonly "0": "巳日乃孚，元亨利贞，悔亡。";
        readonly "1": "初九：巩用黄牛之革。";
        readonly "2": "六二：巳日乃革之，征吉，无咎。";
        readonly "3": "九三：征凶，贞厉，革言三就，有孚。";
        readonly "4": "九四：悔亡，有孚改命，吉。";
        readonly "5": "九五：大人虎变，未占有孚。";
        readonly "6": "上六：君子豹变，小人革面，征凶，居贞吉。";
        readonly "7": "彖︰革，水火相息，二女同居，其志不相得，曰革。巳日乃孚；革而信也。文明以说，大亨以正，革而当，其悔乃亡。天地革而四时成，汤武革命，顺乎天而应乎人，革之时大矣哉！";
    };
    readonly 夬: {
        readonly "0": "扬于王庭，孚号，有厉，告自邑，不利即戎，利有攸往。";
        readonly "1": "初九：壮于前趾，往不胜为咎。";
        readonly "2": "九二：惕号，莫夜有戎，勿恤。";
        readonly "3": "九三：壮于頄，有凶。 君子夬夬，独行遇雨，若濡有愠，无咎。";
        readonly "4": "九四：臀无肤，其行次且。 牵羊悔亡，闻言不信。";
        readonly "5": "九五：苋陆夬夬，中行无咎。";
        readonly "6": "上六：无号，终有凶。";
        readonly "7": "彖︰夬，决也，刚决柔也。健而说，决而和，扬于王庭，柔乘五刚也。孚号有厉，其危乃光也。告自邑，不利即戎，所尚乃穷也。利有攸往，刚长乃终也。";
    };
    readonly 离: {
        readonly "0": "利贞，亨。 畜牝牛，吉。";
        readonly "1": "初九：履错然，敬之无咎。";
        readonly "2": "六二：黄离，元吉。";
        readonly "3": "九三：日昃之离，不鼓缶而歌，则大耋之嗟，凶。";
        readonly "4": "九四：突如其来如，焚如，死如，弃如。";
        readonly "5": "六五：出涕沱若，戚嗟若，吉。";
        readonly "6": "上九：王用出征，有嘉折首，获其匪丑，无咎。";
        readonly "7": "彖︰离，丽也；日月丽乎天，百谷草木丽乎土，重明以丽乎正，乃化成天下。柔丽乎中正，故亨；是以畜牝牛吉也。";
    };
    readonly 晋: {
        readonly "0": "康侯用锡马蕃庶，昼日三接。";
        readonly "1": "初六：晋如，摧如，贞吉。 罔孚，裕无咎。";
        readonly "2": "六二：晋如，愁如，贞吉。 受兹介福，于其王母。";
        readonly "3": "六三：众允，悔亡。";
        readonly "4": "九四：晋如硕鼠，贞厉。";
        readonly "5": "六五：悔亡，失得勿恤，往吉无不利。";
        readonly "6": "上九：晋其角，维用伐邑，厉吉无咎，贞吝。";
        readonly "7": "彖︰晋，进也。明出地上，顺而丽乎大明，柔进而上行。是以康侯用锡马蕃庶，昼日三接也。";
    };
    readonly 旅: {
        readonly "0": "小亨，旅贞吉。";
        readonly "1": "初六：旅琐琐，斯其所取灾。";
        readonly "2": "六二：旅即次，怀其资，得童仆贞。";
        readonly "3": "九三：旅焚其次，丧其童仆，贞厉。";
        readonly "4": "九四：旅于处，得其资斧，我心不快。";
        readonly "5": "六五：射雉一矢亡，终以誉命。";
        readonly "6": "上九：鸟焚其巢，旅人先笑后号啕。 丧牛于易，凶。";
        readonly "7": "彖︰旅，小亨，柔得中乎外，而顺乎刚，止而丽乎明，是以小亨，旅贞吉也。旅之时义大矣哉！";
    };
    readonly 未济: {
        readonly "0": "亨，小狐汔济，濡其尾，无攸利。";
        readonly "1": "初六：濡其尾，吝。";
        readonly "2": "九二：曳其轮，贞吉。";
        readonly "3": "六三：未济，征凶，利涉大川。";
        readonly "4": "九四：贞吉，悔亡，震用伐鬼方，三年有赏于大国。";
        readonly "5": "六五：贞吉，无悔，君子之光，有孚，吉。";
        readonly "6": "上九：有孚于饮酒，无咎，濡其首，有孚失是。";
        readonly "7": "彖︰未济，亨；柔得中也。小狐汔济，未出中也。濡其尾，无攸利；不续终也。虽不当位，刚柔应也。";
    };
    readonly 鼎: {
        readonly "0": "元吉，亨。";
        readonly "1": "初六：鼎颠趾，利出否，得妾以其子，无咎。";
        readonly "2": "九二：鼎有实，我仇有疾，不我能即，吉。";
        readonly "3": "九三：鼎耳革，其行塞，雉膏不食，方雨亏悔，终吉。";
        readonly "4": "九四：鼎折足，覆公𫗧，其形渥，凶。";
        readonly "5": "六五：鼎黄耳金铉，利贞。";
        readonly "6": "上九：鼎玉铉，大吉，无不利。";
        readonly "7": "彖︰鼎，象也。以木巽火，亨饪也。圣人亨以享上帝，而大亨以养圣贤。巽而耳目聪明，柔进而上行，得中而应乎刚，是以元亨。";
    };
    readonly 噬嗑: {
        readonly "0": "亨。 利用狱。";
        readonly "1": "初九：履校灭趾，无咎。";
        readonly "2": "六二：噬肤灭鼻，无咎。";
        readonly "3": "六三：噬腊肉，遇毒﹔小吝，无咎。";
        readonly "4": "九四：噬干胏，得金矢，利艰贞，吉。";
        readonly "5": "六五：噬干肉，得黄金，贞厉，无咎。";
        readonly "6": "上九：何校灭耳，凶。";
        readonly "7": "彖︰颐中有物，曰噬嗑，噬嗑而亨。刚柔分，动而明，雷电合而章。柔得中而上行，虽不当位，利用狱也。";
    };
    readonly 睽: {
        readonly "0": "小事吉。";
        readonly "1": "初九：悔亡，丧马勿逐，自复﹔见恶人无咎。";
        readonly "2": "九二：遇主于巷，无咎。";
        readonly "3": "六三：见舆曳，其牛掣，其人天且劓，无初有终。";
        readonly "4": "九四：睽孤，遇元夫，交孚，厉无咎。";
        readonly "5": "六五：悔亡，厥宗噬肤，往何咎。";
        readonly "6": "上九：睽孤， 见豕负涂，载鬼一车， 先张之弧，后说之弧，匪寇婚媾，往遇雨则吉。";
        readonly "7": "彖︰睽，火动而上，泽动而下；二女同居，其志不同行；说而丽乎明，柔进而上行，得中而应乎刚；是以小事吉。天地睽，而其事同也；男女睽，而其志通也；万物睽，而其事类也；睽之时用大矣哉！";
    };
    readonly 大有: {
        readonly "0": "元亨。";
        readonly "1": "初九：无交害，匪咎，艰则无咎。";
        readonly "2": "九二：大车以载，有攸往，无咎。";
        readonly "3": "九三：公用亨于天子，小人弗克。";
        readonly "4": "九四：匪其彭，无咎。";
        readonly "5": "六五：厥孚交如，威如﹔吉。";
        readonly "6": "上九：自天佑之，吉无不利。";
        readonly "7": "彖︰大有，柔得尊位，大中而上下应之，曰大有。其德刚健而文明，应乎天而时行，是以元亨。";
    };
    readonly 震: {
        readonly "0": "亨。 震来虩虩，笑言哑哑。 震惊百里，不丧匕鬯。";
        readonly "1": "初九：震来虩虩，后笑言哑哑，吉。";
        readonly "2": "六二：震来厉，亿丧贝，跻于九陵，勿逐，七日得。";
        readonly "3": "六三：震苏苏，震行无眚。";
        readonly "4": "九四：震遂泥。";
        readonly "5": "六五：震往来厉，亿无丧，有事。";
        readonly "6": "上六：震索索，视矍矍，征凶。 震不于其躬，于其邻，无咎。 婚媾有言。";
        readonly "7": "彖︰震，亨。震来虩虩，恐致福也。笑言哑哑，后有则也。震惊百里，惊远而惧迩也。出可以守宗庙社稷，以为祭主也";
    };
    readonly 豫: {
        readonly "0": "利建侯行师。";
        readonly "1": "初六：鸣豫，凶。";
        readonly "2": "六二：介于石，不终日，贞吉。";
        readonly "3": "六三：盱豫，悔。 迟有悔。";
        readonly "4": "九四：由豫，大有得。勿疑。 朋盍簪。";
        readonly "5": "六五：贞疾，恒不死。";
        readonly "6": "上六：冥豫，成有渝，无咎。";
        readonly "7": "彖︰豫，刚应而志行，顺以动，豫。豫，顺以动，故天地如之，而况建侯行师乎？天地以顺动，故日月不过，而四时不忒；圣人以顺动，则刑罚清而民服。豫之时义大矣哉！";
    };
    readonly 小过: {
        readonly "0": "亨，利贞，可小事，不可大事。飞鸟遗之音，不宜上宜下，大吉。";
        readonly "1": "初六：飞鸟以凶。";
        readonly "2": "六二：过其祖，遇其妣；不及其君，遇其臣；无咎。";
        readonly "3": "九三：弗过防之，从或戕之，凶。";
        readonly "4": "九四：无咎，弗过遇之。 往厉必戒，勿用永贞。";
        readonly "5": "六五：密云不雨，自我西郊，公弋取彼在穴。";
        readonly "6": "上六：弗遇过之，飞鸟离之，凶，是谓灾眚。";
        readonly "7": "彖︰小过，小者过而亨也。过以利贞，与时行也。柔得中，是以小事吉也。刚失位而不中，是以不可大事也。有飞鸟之象焉，有飞鸟遗之音，不宜上宜下，大吉；上逆而下顺也。";
    };
    readonly 解: {
        readonly "0": "利西南，无所往，其来复吉。 有攸往，夙吉。";
        readonly "1": "初六：无咎。";
        readonly "2": "九二：田获三狐，得黄矢，贞吉。";
        readonly "3": "六三：负且乘，致寇至，贞吝。";
        readonly "4": "九四：解而拇，朋至斯孚。";
        readonly "5": "六五：君子维有解，吉；有孚于小人。";
        readonly "6": "上六：公用射隼，于高墉之上，获之，无不利。";
        readonly "7": "彖︰解，险以动，动而免乎险，解。解利西南，往得众也。其来复吉，乃得中也。有攸往夙吉，往有功也。天地解，而雷雨作，雷雨作，而百果草木皆甲坼，解之时大矣哉！";
    };
    readonly 恒: {
        readonly "0": "亨，无咎，利贞，利有攸往。";
        readonly "1": "初六：浚恒，贞凶，无攸利。";
        readonly "2": "九二：悔亡。";
        readonly "3": "九三：不恒其德，或承之羞，贞吝。";
        readonly "4": "九四：田无禽。";
        readonly "5": "六五：恒其德，贞，妇人吉，夫子凶。";
        readonly "6": "上六：振恒，凶。";
        readonly "7": "彖︰恒，久也。刚上而柔下，雷风相与，巽而动，刚柔皆应，恒。恒亨无咎，利贞；久于其道也，天地之道，恒久而不已也。利有攸往，终则有始也。日月得天，而能久照，四时变化，而能久成，圣人久于其道，而天下化成；观其所恒，而天地万物之情可见矣！";
    };
    readonly 丰: {
        readonly "0": "亨，王假之，勿忧，宜日中。";
        readonly "1": "初九：遇其配主，虽旬无咎，往有尚。";
        readonly "2": "六二：丰其蔀，日中见斗，往得疑疾，有孚发若，吉。";
        readonly "3": "九三：丰其沛，日中见昧，折其右肱，无咎。";
        readonly "4": "九四：丰其蔀，日中见斗，遇其夷主，吉。";
        readonly "5": "六五：来章，有庆誉，吉。";
        readonly "6": "上六：丰其屋，蔀其家，窥其户，阒其无人，三岁不见，凶。";
        readonly "7": "彖︰丰，大也。明以动，故丰。王假之，尚大也。勿忧宜日中，宜照天下也。日中则昃，月盈则食，天地盈虚，与时消息，而况人于人乎？况于鬼神乎？";
    };
    readonly 归妹: {
        readonly "0": "征凶，无攸利。";
        readonly "1": "初九：归妹以娣，跛能履，征吉。";
        readonly "2": "九二：眇能视，利幽人之贞。";
        readonly "3": "六三：归妹以须，反归以娣。";
        readonly "4": "九四：归妹愆期，迟归有时。";
        readonly "5": "六五：帝乙归妹，其君之袂，不如其娣之袂良，月几望，吉。";
        readonly "6": "上六：女承筐无实，士刲羊无血，无攸利。";
        readonly "7": "彖︰归妹，天地之大义也。天地不交，而万物不兴，归妹人之终始也。说以动，所归妹也。征凶，位不当也。无攸利，柔乘刚也。";
    };
    readonly 大壮: {
        readonly "0": "利贞。";
        readonly "1": "初九：壮于趾，征凶，有孚。";
        readonly "2": "九二：贞吉。";
        readonly "3": "九三：小人用壮，君子用罔，贞厉。 羝羊触藩，羸其角。";
        readonly "4": "九四：贞吉悔亡，藩决不羸，壮于大舆之輹。";
        readonly "5": "六五：丧羊于易，无悔。";
        readonly "6": "上六：羝羊触藩，不能退，不能遂，无攸利，艰则吉。";
        readonly "7": "彖︰大壮，大者壮也。刚以动，故壮。大壮利贞；大者正也。正大而天地之情可见矣！";
    };
    readonly 巽: {
        readonly "0": "小亨，利攸往，利见大人。";
        readonly "1": "初六：进退，利武人之贞。";
        readonly "2": "九二：巽在床下，用史巫纷若，吉无咎。";
        readonly "3": "九三：频巽，吝。";
        readonly "4": "六四：悔亡，田获三品。";
        readonly "5": "九五：贞吉悔亡，无不利。 无初有终，先庚三日，后庚三日，吉。";
        readonly "6": "上九：巽在床下，丧其资斧，贞凶。";
        readonly "7": "彖︰重巽以申命，刚巽乎中正而志行。柔皆顺乎刚，是以小亨，利有攸往，利见大人。";
    };
    readonly 观: {
        readonly "0": "盥而不荐，有孚颙若。";
        readonly "1": "初六：童观，小人无咎，君子吝。";
        readonly "2": "六二：窥观，利女贞。";
        readonly "3": "六三：观我生，进退。";
        readonly "4": "六四：观国之光，利用宾于王。";
        readonly "5": "九五：观我生，君子无咎。";
        readonly "6": "上九：观其生，君子无咎。";
        readonly "7": "彖︰大观在上，顺而巽，中正以观天下。观，盥而不荐，有孚颙若，下观而化也。观天之神道，而四时不忒，圣人以神道设教，而天下服矣。";
    };
    readonly 渐: {
        readonly "0": "女归吉，利贞。";
        readonly "1": "初六：鸿渐于干，小子厉，有言，无咎。";
        readonly "2": "六二：鸿渐于磐，饮食衎衎，吉。";
        readonly "3": "九三：鸿渐于陆，夫征不复，妇孕不育，凶；利御寇。";
        readonly "4": "六四：鸿渐于木，或得其桷，无咎。";
        readonly "5": "九五：鸿渐于陵，妇三岁不孕，终莫之胜，吉。";
        readonly "6": "上九：鸿渐于逵，其羽可用为仪，吉。";
        readonly "7": "彖︰渐之进也，女归吉也。进得位，往有功也。进以正，可以正邦也。其位刚，得中也。止而巽，动不穷也。";
    };
    readonly 涣: {
        readonly "0": "亨。 王假有庙，利涉大川，利贞。";
        readonly "1": "初六：用拯马壮，吉。";
        readonly "2": "九二：涣奔其机，悔亡。";
        readonly "3": "六三：涣其躬，无悔。";
        readonly "4": "六四：涣其群，元吉。 涣有丘，匪夷所思。";
        readonly "5": "九五：涣汗其大号，涣王居，无咎。";
        readonly "6": "上九：涣其血，去逖出，无咎。";
        readonly "7": "彖︰涣，亨。刚来而不穷，柔得位乎外而上同。王假有庙，王乃在中也。利涉大川，乘木有功也。";
    };
    readonly 益: {
        readonly "0": "利有攸往，利涉大川。";
        readonly "1": "初九：利用为大作，元吉，无咎。";
        readonly "2": "六二：或益之，十朋之龟弗克违，永贞吉。 王用享于帝，吉。";
        readonly "3": "六三：益之用凶事，无咎。 有孚中行，告公用圭。";
        readonly "4": "六四：中行，告公从。 利用为依迁国。";
        readonly "5": "九五：有孚惠心，勿问元吉。 有孚惠我德。";
        readonly "6": "上九：莫益之，或击之，立心勿恒，凶。";
        readonly "7": "彖︰益，损上益下，民说无疆，自上下下，其道大光。利有攸往，中正有庆。利涉大川，木道乃行。益动而巽，日进无疆。天施地生，其益无方。凡益之道，与时偕行。";
    };
    readonly 家人: {
        readonly "0": "利女贞。";
        readonly "1": "初九：闲有家，悔亡。";
        readonly "2": "六二：无攸遂，在中馈，贞吉。";
        readonly "3": "九三：家人嗃嗃，悔厉吉﹔妇子嘻嘻，终吝。";
        readonly "4": "六四：富家，大吉。";
        readonly "5": "九五：王假有家，勿恤吉。";
        readonly "6": "上九：有孚威如，终吉。";
        readonly "7": "彖︰家人，女正位乎内，男正位乎外，男女正，天地之大义也。家人有严君焉，父母之谓也。父父，子子，兄兄，弟弟，夫夫，妇妇，而家道正；正家而天下定矣。";
    };
    readonly 中孚: {
        readonly "0": "豚鱼吉，利涉大川，利贞。";
        readonly "1": "初九：虞吉，有他不燕。";
        readonly "2": "九二：鸣鹤在阴，其子和之，我有好爵，吾与尔靡之。";
        readonly "3": "六三：得敌，或鼓或罢，或泣或歌。";
        readonly "4": "六四：月几望，马匹亡，无咎。";
        readonly "5": "九五：有孚挛如，无咎。";
        readonly "6": "上九：翰音登于天，贞凶。";
        readonly "7": "彖︰中孚，柔在内而刚得中。说而巽，孚，乃化邦也。豚鱼吉，信及豚鱼也。利涉大川，乘木舟虚也。中孚以利贞，乃应乎天也。";
    };
    readonly 小畜: {
        readonly "0": "亨。 密云不雨，自我西郊。";
        readonly "1": "初九：复自道，何其咎，吉。";
        readonly "2": "九二：牵复，吉。";
        readonly "3": "九三：舆说辐，夫妻反目。";
        readonly "4": "六四：有孚，血去惕出，无咎。";
        readonly "5": "九五：有孚挛如，富以其邻。";
        readonly "6": "上九：既雨既处，尚德载，妇贞厉。 月几望，君子征凶。";
        readonly "7": "彖︰小畜，柔得位，而上下应之，曰小畜。健而巽，刚中而志行，乃亨。密云不雨，尚往也。自我西郊，施未行也。";
    };
    readonly 坎: {
        readonly "0": "习坎，有孚，维心亨，行有尚。";
        readonly "1": "初六：习坎，入于坎窞，凶。";
        readonly "2": "九二：坎有险，求小得。";
        readonly "3": "六三：来之坎坎，险且枕，入于坎窞，勿用。";
        readonly "4": "六四：樽酒簋贰，用缶，纳约自牖，终无咎。";
        readonly "5": "九五：坎不盈，只既平，无咎。";
        readonly "6": "上六：系用徽𬙊，置于丛棘，三岁不得，凶。";
        readonly "7": "彖︰习坎，重险也。水流而不盈，行险而不失其信。维心亨，乃以刚中也。行有尚，往有功也。天险不可升也，地险山川丘陵也，王公设险以守其国，坎之时用大矣哉！";
    };
    readonly 比: {
        readonly "0": "吉。 原筮元永贞，无咎。 不宁方来，后夫凶。";
        readonly "1": "初六：有孚比之，无咎。 有孚盈缶，终来有他，吉。";
        readonly "2": "六二：比之自内，贞吉。";
        readonly "3": "六三：比之匪人。";
        readonly "4": "六四：外比之，贞吉。";
        readonly "5": "九五：显比，王用三驱，失前禽。 邑人不戒，吉。";
        readonly "6": "上六：比之无首，凶。";
        readonly "7": "彖︰比，吉也，比，辅也，下顺从也。原筮元永贞，无咎，以刚中也。不宁方来，上下应也。后夫凶，其道穷也。";
    };
    readonly 蹇: {
        readonly "0": "利西南，不利东北；利见大人，贞吉。";
        readonly "1": "初六：往蹇，来誉。";
        readonly "2": "六二：王臣蹇蹇，匪躬之故。";
        readonly "3": "九三：往蹇来反。";
        readonly "4": "六四：往蹇来连。";
        readonly "5": "九五：大蹇朋来。";
        readonly "6": "上六：往蹇来硕，吉；利见大人。";
        readonly "7": "彖︰蹇，难也，险在前也。见险而能止，知矣哉！蹇利西南，往得中也；不利东北，其道穷也。利见大人，往有功也。当位贞吉，以正邦也。蹇之时用大矣哉！";
    };
    readonly 井: {
        readonly "0": "改邑不改井，无丧无得，往来井井。汔至，亦未繘井，羸其瓶，凶。";
        readonly "1": "初六：井泥不食，旧井无禽。";
        readonly "2": "九二：井谷射鲋，瓮敝漏。";
        readonly "3": "九三：井渫不食，为我民恻，可用汲，王明，并受其福。";
        readonly "4": "六四：井甃，无咎。";
        readonly "5": "九五：井冽，寒泉食。";
        readonly "6": "上六：井收勿幕，有孚元吉。";
        readonly "7": "彖︰巽乎水而上水，井；井养而不穷也。改邑不改井，乃以刚中也。汔至亦未繘井，未有功也。羸其瓶，是以凶也。";
    };
    readonly 屯: {
        readonly "0": "元，亨，利，贞，勿用，有攸往，利建侯。";
        readonly "1": "初九：磐桓﹔利居贞，利建侯。";
        readonly "2": "六二：屯如邅如，乘马班如。 匪寇婚媾，女子贞不字，十年乃字。";
        readonly "3": "六三：既鹿无虞，惟入于林中，君子几不如舍，往吝。";
        readonly "4": "六四：乘马班如，求婚媾，无不利。";
        readonly "5": "九五：屯其膏，小贞吉，大贞凶。";
        readonly "6": "上六：乘马班如，泣血涟如。";
        readonly "7": "彖︰屯，刚柔始交而难生，动乎险中，大亨贞。雷雨之动满盈，天造草昧，宜建侯而不宁。";
    };
    readonly 既济: {
        readonly "0": "亨，小利贞，初吉终乱。";
        readonly "1": "初九：曳其轮，濡其尾，无咎。";
        readonly "2": "六二：妇丧其茀，勿逐，七日得。";
        readonly "3": "九三：高宗伐鬼方，三年克之，小人勿用。";
        readonly "4": "六四：𦈡有衣袽，终日戒。";
        readonly "5": "九五：东邻杀牛，不如西邻之禴祭，实受其福。";
        readonly "6": "上六：濡其首，厉。";
        readonly "7": "彖︰既济，亨，小者亨也。利贞，刚柔正而位当也。初吉，柔得中也。终止则乱，其道穷也。";
    };
    readonly 节: {
        readonly "0": "亨。 苦节不可贞。";
        readonly "1": "初九：不出户庭，无咎。";
        readonly "2": "九二：不出门庭，凶。";
        readonly "3": "六三：不节若，则嗟若，无咎。";
        readonly "4": "六四：安节，亨。";
        readonly "5": "九五：甘节，吉﹔往有尚。";
        readonly "6": "上六：苦节，贞凶，悔亡。";
        readonly "7": "彖︰节，亨，刚柔分，而刚得中。苦节不可贞，其道穷也。说以行险，当位以节，中正以通。天地节而四时成，节以制度，不伤财，不害民。";
    };
    readonly 需: {
        readonly "0": "有孚，光亨，贞吉。 利涉大川。";
        readonly "1": "初九：需于郊。 利用恒，无咎。";
        readonly "2": "九二：需于沙。 小有言，终吉。";
        readonly "3": "九三：需于泥，致寇至。";
        readonly "4": "六四：需于血，出自穴。";
        readonly "5": "九五：需于酒食，贞吉。";
        readonly "6": "上六：入于穴，有不速之客三人来，敬之终吉。";
        readonly "7": "彖︰需，须也；险在前也。刚健而不陷，其义不困穷矣。需有孚，光亨，贞吉。位乎天位，以正中也。利涉大川，往有功也。";
    };
    readonly 艮: {
        readonly "0": "艮其背，不获其身，行其庭，不见其人，无咎。";
        readonly "1": "初六：艮其趾，无咎，利永贞。";
        readonly "2": "六二：艮其腓，不拯其随，其心不快。";
        readonly "3": "九三：艮其限，列其夤，厉薰心。";
        readonly "4": "六四：艮其身，无咎。";
        readonly "5": "六五：艮其辅，言有序，悔亡。";
        readonly "6": "上九：敦艮，吉。";
        readonly "7": "彖︰艮，止也。时止则止，时行则行，动静不失其时，其道光明。艮其止，止其所也。上下敌应，不相与也。是以不获其身，行其庭不见其人，无咎也。";
    };
    readonly 剥: {
        readonly "0": "不利有攸往。";
        readonly "1": "初六：剥床以足，蔑贞凶。";
        readonly "2": "六二：剥床以辨，蔑贞凶。";
        readonly "3": "六三：剥之，无咎。";
        readonly "4": "六四：剥床以肤，凶。";
        readonly "5": "六五：贯鱼，以宫人宠，无不利。";
        readonly "6": "上九：硕果不食，君子得舆，小人剥庐。";
        readonly "7": "彖︰剥，剥也，柔变刚也。不利有攸往，小人长也。顺而止之，观象也。君子尚消息盈虚，天行也。";
    };
    readonly 蒙: {
        readonly "0": "亨。 匪我求童蒙，童蒙求我。 初噬告，再三渎，渎则不告。利贞。";
        readonly "1": "初六：发蒙，利用刑人，用说桎梏，以往吝。";
        readonly "2": "九二：包蒙吉，纳妇吉，子克家。";
        readonly "3": "六三：勿用娶女，见金夫，不有躬，无攸利。";
        readonly "4": "六四：困蒙，吝。";
        readonly "5": "六五：童蒙，吉。";
        readonly "6": "上九：击蒙，不利为寇，利御寇。";
        readonly "7": "彖︰蒙，山下有险，险而止，蒙。蒙亨，以亨行时中也。匪我求童蒙，童蒙求我，志应也。初噬告，以刚中也。再三渎，渎则不告，渎蒙也。蒙以养正，圣功也。";
    };
    readonly 蛊: {
        readonly "0": "元亨，利涉大川。 先甲三日，后甲三日。";
        readonly "1": "初六：干父之蛊，有子考无咎，厉终吉。";
        readonly "2": "九二：干母之蛊，不可贞。";
        readonly "3": "九三：干父之蛊，小有悔，无大咎。";
        readonly "4": "六四：裕父之蛊，往见吝。";
        readonly "5": "六五：干父之蛊，用誉。";
        readonly "6": "上九：不事王侯，高尚其事。";
        readonly "7": "彖︰蛊，刚上而柔下，巽而止，蛊。蛊，元亨，而天下治也。利涉大川，往有事也。先甲三日，后甲三日，终则有始，天行也。";
    };
    readonly 颐: {
        readonly "0": "贞吉。观颐，自求口实。";
        readonly "1": "初九：舍尔灵龟，观我朵颐，凶。";
        readonly "2": "六二：颠颐，拂经，与丘颐，征凶。";
        readonly "3": "六三：拂颐，贞凶，十年勿用，无攸利。";
        readonly "4": "六四：颠颐吉，虎视眈眈，其欲逐逐，无咎。";
        readonly "5": "六五：拂经，居贞吉，不可涉大川。";
        readonly "6": "上九：由颐，厉吉，利涉大川。";
        readonly "7": "彖︰颐贞吉，养正则吉也。观颐，观其所养也；自求口实，观其自养也。天地养万物，圣人养贤，以及万民；颐之时大矣哉！";
    };
    readonly 贲: {
        readonly "0": "亨。 小利有所往。";
        readonly "1": "初九：贲其趾，舍车而徒。";
        readonly "2": "六二：贲其须。";
        readonly "3": "九三：贲如濡如，永贞吉。";
        readonly "4": "六四：贲如皤如，白马翰如，匪寇婚媾。";
        readonly "5": "六五：贲于丘园，束帛戋戋，吝，终吉。";
        readonly "6": "上九：白贲，无咎。";
        readonly "7": "彖︰贲，亨；柔来而文刚，故亨。分刚上而文柔，故小利有攸往。天文也；文明以止，人文也。观乎天文，以察时变；观乎人文，以化成天下。";
    };
    readonly 损: {
        readonly "0": "有孚，元吉，无咎，可贞，利有攸往。曷之用，二簋可用享。";
        readonly "1": "初九：已事遄往，无咎，酌损之。";
        readonly "2": "九二：利贞，征凶，弗损益之。";
        readonly "3": "六三：三人行，则损一人；一人行，则得其友。";
        readonly "4": "六四：损其疾，使遄有喜，无咎。";
        readonly "5": "六五：或益之，十朋之龟弗克违，元吉。";
        readonly "6": "上九：弗损益之，无咎，贞吉，利有攸往，得臣无家。";
        readonly "7": "彖︰损，损下益上，其道上行。损而有孚，元吉，无咎，可贞，利有攸往。曷之用？二簋可用享；二簋应有时。损刚益柔有时，损益盈虚，与时偕行。";
    };
    readonly 大畜: {
        readonly "0": "利贞，不家食吉，利涉大川。";
        readonly "1": "初九：有厉利已。";
        readonly "2": "九二：舆说辐。";
        readonly "3": "九三：良马逐，利艰贞。 曰闲舆卫，利有攸往。";
        readonly "4": "六四：童牛之牿，元吉。";
        readonly "5": "六五：豮豕之牙，吉。";
        readonly "6": "上九：何天之衢，亨。";
        readonly "7": "彖︰大畜，刚健笃实辉光，日新其德，刚上而尚贤。能止健，大正也。不家食吉，养贤也。利涉大川，应乎天也。";
    };
    readonly 谦: {
        readonly "0": "亨，君子有终。";
        readonly "1": "初六：谦谦君子，用涉大川，吉。";
        readonly "2": "六二，鸣谦，贞吉。";
        readonly "3": "九三，劳谦，君子有终，吉。";
        readonly "4": "六四：无不利，㧑谦。";
        readonly "5": "六五：不富，以其邻，利用侵伐，无不利。";
        readonly "6": "上六：鸣谦，利用行师，征邑国。";
        readonly "7": "彖︰谦，亨，天道下济而光明，地道卑而上行。天道亏盈而益谦，地道变盈而流谦，鬼神害盈而福谦，人道恶盈而好谦。谦尊而光，卑而不可逾，君子之终也。";
    };
    readonly 师: {
        readonly "0": "贞，丈人，吉无咎。";
        readonly "1": "初六：师出以律，否臧凶。";
        readonly "2": "九二：在师中，吉无咎，王三锡命。";
        readonly "3": "六三：师或舆尸，凶。";
        readonly "4": "六四：师左次，无咎。";
        readonly "5": "六五：田有禽，利执言，无咎。长子帅师，弟子舆尸，贞凶。";
        readonly "6": "上六：大君有命，开国承家，小人勿用。";
        readonly "7": "彖︰师，众也，贞正也，能以众正，可以王矣。刚中而应，行险而顺，以此毒天下，而民从之，吉又何咎矣。";
    };
    readonly 升: {
        readonly "0": "元亨，用见大人，勿恤，南征吉。";
        readonly "1": "初六：允升，大吉。";
        readonly "2": "九二：孚乃利用禴，无咎。";
        readonly "3": "九三：升虚邑。";
        readonly "4": "六四：王用亨于岐山，吉无咎。";
        readonly "5": "六五：贞吉，升阶。";
        readonly "6": "上六：冥升，利于不息之贞。";
        readonly "7": "彖︰柔以时升，巽而顺，刚中而应，是以大亨；用见大人，勿恤，有庆也；南征吉，志行也。";
    };
    readonly 复: {
        readonly "0": "亨。 出入无疾，朋来无咎。 反复其道，七日来复，利有攸往。";
        readonly "1": "初九：不复远，无只悔，元吉。";
        readonly "2": "六二：休复，吉。";
        readonly "3": "六三：频复，厉无咎。";
        readonly "4": "六四：中行独复。";
        readonly "5": "六五：敦复，无悔。";
        readonly "6": "上六：迷复，凶，有灾眚。用行师，终有大败，以其国君凶﹔至于十年不克征。";
        readonly "7": "彖︰复，亨。刚反，动而以顺行，是以出入无疾，朋来无咎。反复其道，七日来复，天行也。利有攸往，刚长也。复，其见天地之心乎。";
    };
    readonly 明夷: {
        readonly "0": "利艰贞。";
        readonly "1": "初九：明夷于飞，垂其翼。 君子于行，三日不食， 有攸往，主人有言。";
        readonly "2": "六二：明夷，夷于左股，用拯马壮，吉。";
        readonly "3": "九三：明夷于南狩，得其大首，不可疾贞。";
        readonly "4": "六四：入于左腹，获明夷之心，出于门庭。";
        readonly "5": "六五：箕子之明夷，利贞。";
        readonly "6": "上六：不明晦，初登于天，后入于地。";
        readonly "7": "彖︰明入地中，明夷。内文明而外柔顺，以蒙大难，文王以之。利艰贞，晦其明也。内难而能正其志，箕子以之。";
    };
    readonly 临: {
        readonly "0": "元，亨，利，贞。 至于八月有凶。";
        readonly "1": "初九：咸临，贞吉。";
        readonly "2": "九二：咸临，吉无不利。";
        readonly "3": "六三：甘临，无攸利。 既忧之，无咎。";
        readonly "4": "六四：至临，无咎。";
        readonly "5": "六五：知临，大君之宜，吉。";
        readonly "6": "上六：敦临，吉无咎。";
        readonly "7": "彖︰临，刚浸而长，说而顺，刚中而应，大亨以正，天之道也。至于八月有凶，消不久也。";
    };
    readonly 泰: {
        readonly "0": "小往大来，吉亨。";
        readonly "1": "初九：拔茅茹，以其夤，征吉。";
        readonly "2": "九二：包荒，用冯河，不遐遗，朋亡，得尚于中行。";
        readonly "3": "九三：无平不陂，无往不复，艰贞无咎。 勿恤其孚，于食有福。";
        readonly "4": "六四：翩翩不富，以其邻，不戒以孚。";
        readonly "5": "六五：帝乙归妹，以祉元吉。";
        readonly "6": "上六：城复于隍，勿用师。 自邑告命，贞吝。";
        readonly "7": "彖︰泰，小往大来，吉亨，则是天地交而万物通也，上下交而其志同也。内阳而外阴，内健而外顺，内君子而外小人。君子道长，小人道消也。";
    };
};

/** 卦位键 */
export declare type GuaKey = 'benGua' | 'zhiGua' | 'huGua';

/** 单卦排盘结果 */
export declare interface GuaPan {
    guaName: string;
    palace: string;
    palaceWuXing: WuXing;
    palaceLevel: string;
    yaoList: YaoData[];
    guaCi: string;
    yaoCi: string[];
    tuanCi: string;
    shenYao?: number;
    fuShen?: FuShenData[];
    pangFuShen?: FuShenData[];
}

/**
 * 判断爻是否为动爻
 */
export declare function isMovingYao(yaoValue: number): boolean;

export declare const JIAZI_60: readonly ["甲子", "乙丑", "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未", "壬申", "癸酉", "甲戌", "乙亥", "丙子", "丁丑", "戊寅", "己卯", "庚辰", "辛巳", "壬午", "癸未", "甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑", "庚寅", "辛卯", "壬辰", "癸巳", "甲午", "乙未", "丙申", "丁酉", "戊戌", "己亥", "庚子", "辛丑", "壬寅", "癸卯", "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑", "甲寅", "乙卯", "丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉", "壬戌", "癸亥"];

export declare const JIEQI_NAMES: readonly ["春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至", "小寒", "大寒", "立春", "雨水", "惊蛰"];

export declare const LIU_QIN: readonly ["父母", "兄弟", "官鬼", "妻财", "子孙"];

export declare const LIU_SHOU: readonly ["青龙", "朱雀", "勾陈", "腾蛇", "白虎", "玄武"];

/** 六亲 */
export declare type LiuQin = '父母' | '兄弟' | '官鬼' | '妻财' | '子孙';

/** 六兽 */
export declare type LiuShou = '青龙' | '朱雀' | '勾陈' | '腾蛇' | '白虎' | '玄武';

/**
 * 略筮法（简易蓍草法）
 *
 * 用49根蓍草进行三次揲数起卦：
 * - 揲8得下卦（1~8对应八卦）
 * - 揲8得上卦（1~8对应八卦）
 * - 揲6得动爻（1~6对应爻位）
 *
 * @returns 6位爻字符串（6/7/8/9），含一个动爻
 */
export declare function lueshifa(): YaoString;

/** 农历日期信息 */
declare interface LunarDate {
    year: number;
    month: number;
    day: number;
    isLeap: boolean;
    yearGanZhi: GanZhi;
    monthGanZhi: GanZhi;
    dayGanZhi: GanZhi;
    hourGanZhi: GanZhi;
}

/**
 * 手动输入起卦
 * 校验并归一化6位爻值
 */
export declare function manualQiGua(input: string): YaoString;

export declare const NAYIN_60: {
    readonly 甲子: "海中金";
    readonly 乙丑: "海中金";
    readonly 丙寅: "炉中火";
    readonly 丁卯: "炉中火";
    readonly 戊辰: "大林木";
    readonly 己巳: "大林木";
    readonly 庚午: "路旁土";
    readonly 辛未: "路旁土";
    readonly 壬申: "剑锋金";
    readonly 癸酉: "剑锋金";
    readonly 甲戌: "山头火";
    readonly 乙亥: "山头火";
    readonly 丙子: "涧下水";
    readonly 丁丑: "涧下水";
    readonly 戊寅: "城头土";
    readonly 己卯: "城头土";
    readonly 庚辰: "白蜡金";
    readonly 辛巳: "白蜡金";
    readonly 壬午: "杨柳木";
    readonly 癸未: "杨柳木";
    readonly 甲申: "泉中水";
    readonly 乙酉: "泉中水";
    readonly 丙戌: "屋上土";
    readonly 丁亥: "屋上土";
    readonly 戊子: "霹雳火";
    readonly 己丑: "霹雳火";
    readonly 庚寅: "松柏木";
    readonly 辛卯: "松柏木";
    readonly 壬辰: "长流水";
    readonly 癸巳: "长流水";
    readonly 甲午: "沙中金";
    readonly 乙未: "沙中金";
    readonly 丙申: "山下火";
    readonly 丁酉: "山下火";
    readonly 戊戌: "平地木";
    readonly 己亥: "平地木";
    readonly 庚子: "壁上土";
    readonly 辛丑: "壁上土";
    readonly 壬寅: "金箔金";
    readonly 癸卯: "金箔金";
    readonly 甲辰: "覆灯火";
    readonly 乙巳: "覆灯火";
    readonly 丙午: "天河水";
    readonly 丁未: "天河水";
    readonly 戊申: "大驿土";
    readonly 己酉: "大驿土";
    readonly 庚戌: "钗钏金";
    readonly 辛亥: "钗钏金";
    readonly 壬子: "桑柘木";
    readonly 癸丑: "桑柘木";
    readonly 甲寅: "大溪水";
    readonly 乙卯: "大溪水";
    readonly 丙辰: "沙中土";
    readonly 丁巳: "沙中土";
    readonly 戊午: "天上火";
    readonly 己未: "天上火";
    readonly 庚申: "石榴木";
    readonly 辛酉: "石榴木";
    readonly 壬戌: "大海水";
    readonly 癸亥: "大海水";
};

/**
 * 数组起卦
 *
 * 一组数字按奇偶分割：
 * - 偶数个：前半为上卦，后半为下卦
 * - 奇数个：前半少一个数字（如5个数字，前2后3）
 * - 上卦 = 前半数字之和 % 8
 * - 下卦 = 后半数字之和 % 8
 * - 动爻 = (上卦数 + 下卦数 + 时辰数) % 6
 *
 * @param numbers - 数字数组（至少2个）
 * @param hourZhiIndex - 时辰地支序号（子=1, 丑=2, ...亥=12），用于计算动爻
 * @returns 6位爻字符串
 *
 * @example
 * numberArrayQiGua([3, 8, 4, 2], 5);     // 4个数字，前2后2，时辰5
 * numberArrayQiGua([1, 2, 3, 4, 5], 8);  // 5个数字，前2后3，时辰8
 */
export declare function numberArrayQiGua(numbers: number[], hourZhiIndex: number): YaoString;

/** 完整排盘结果 */
export declare interface PanResult {
    queryTime: DivinationOptions;
    ganZhiYear: GanZhi;
    ganZhiMonth: GanZhi;
    ganZhiDay: GanZhi;
    ganZhiHour: GanZhi;
    lunarDate: {
        year: number;
        month: number;
        day: number;
        isLeap: boolean;
    };
    solarTerm: string;
    dayKong: string;
    hourKong: string;
    monthJian: string;
    shenSha: ShenShaMap;
    benGua: GuaPan;
    zhiGua: GuaPan;
    huGua: GuaPan;
    yaoString: YaoString;
    dongYaoCount: number;
    explanation: string;
}

export declare type QingyiSuoBoKey = '木' | '火' | '金' | '日' | '月' | '土' | '水';

/** 青衣星宿算法的完整推排结果 */
export declare interface QingyiXingXiuResult {
    /** 青衣页面使用的 0/1 六爻码，1 为阳爻，0 为阴爻 */
    yaoCode: string;
    /** 所属宫，顺序来自原打包文件：坤艮坎巽震离兑乾 */
    palace: string;
    /** 所属宫索引，范围 0-7 */
    palaceIndex: number;
    /** 宫内层级索引，范围 0-7 */
    palaceLevelIndex: number;
    /** 世爻位置，1 为初爻，6 为上爻 */
    shiPosition: number;
    /** 应爻位置，1 为初爻，6 为上爻 */
    yingPosition: number;
    /** 第一套星宿，按初爻到上爻排序 */
    primaryXingXiu: string[];
    /** 第二套星宿，按初爻到上爻排序 */
    secondaryXingXiu: string[];
    /** 逐爻星宿、锁泊数据，按初爻到上爻排序 */
    yaoList: QingyiXingXiuYao[];
}

/** 单爻青衣星宿与锁泊结果 */
export declare interface QingyiXingXiuYao {
    /** 爻位，1 为初爻，6 为上爻 */
    position: number;
    /** 第一套星宿全称，也是青衣页面实际展示的星宿来源 */
    xingXiu: string;
    /** 第二套星宿全称，青衣算法会生成但页面未用于锁泊展示 */
    secondaryXingXiu: string;
    /** 星宿名首字，如“柳土獐”的“柳” */
    xingXiuName: string;
    /** 星宿第二字，青衣锁泊表按此字分组 */
    suoBoKey: QingyiSuoBoKey;
    /** 传入爻支时返回对应锁泊；未传爻支时为空 */
    suoBo?: string;
}

/**
 * 通用工具函数
 */
/**
 * 循环轮转列表
 * 将列表从指定元素开始重新排列
 * @example rotateList(['a','b','c','d'], 'c') => ['c','d','a','b']
 */
export declare function rotateList<T>(list: T[], start: T): T[];

/**
 * 循环轮转列表（按索引）
 */
export declare function rotateListByIndex<T>(list: T[], startIndex: number): T[];

/** 神煞映射 */
export declare type ShenShaMap = Record<ShenShaName, string[]>;

/** 神煞名称 */
export declare type ShenShaName = '驿马' | '桃花' | '华盖' | '天医' | '天喜' | '天马' | '天乙贵人' | '禄神' | '文昌';

/** 世应标记 */
export declare type ShiYingMark = '初' | '二' | '三' | '四' | '五' | '六' | '世' | '应';

/**
 * 公历转农历
 */
export declare function solarToLunar(year: number, month: number, day: number, hour?: number): LunarDate;

/** 岁限区间 */
export declare interface SuiXianRange {
    startAge: number;
    endAge: number;
}

/**
 * 三数起卦
 *
 * 第1数/8 余数为上卦，第2数/8 余数为下卦，第3数/6 余数为动爻
 *
 * @param num1 - 第一个数字（上卦）
 * @param num2 - 第二个数字（下卦）
 * @param num3 - 第三个数字（动爻）
 * @returns 6位爻字符串
 *
 * @example
 * threeNumberQiGua(5, 8, 3);  // 上卦5=巽，下卦8=坤，动爻3
 */
export declare function threeNumberQiGua(num1: number, num2: number, num3: number): YaoString;

export declare const TIAN_GAN: readonly ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

/**
 * 时间起卦
 * 按梅花易数时间法计算卦象。
 *
 * @param year - 公历年，保留用于兼容既有调用形态
 * @param month - 公历月，保留用于兼容既有调用形态
 * @param day - 公历日，保留用于兼容既有调用形态
 * @param hour - 公历小时，保留用于兼容既有调用形态
 * @param lunarMonth - 农历月数
 * @param lunarDay - 农历日数
 * @param yearZhi - 年支，如“子”“丑”
 * @param hourZhi - 时支，如“子”“丑”
 * @returns 6位爻字符串（6/7/8/9），含一个动爻
 */
export declare function timeQiGua(year: number, month: number, day: number, hour: number, lunarMonth: number, lunarDay: number, yearZhi: string, hourZhi: string): YaoString;

export declare const WU_XING: readonly ["金", "木", "水", "火", "土"];

/** 五行 */
export declare type WuXing = '金' | '木' | '水' | '火' | '土';

/** 五行生克关系 */
export declare type WuXingRelation = '生我' | '我生' | '尅我' | '我尅' | '比和';

/**
 * 根据五行关系确定六亲
 * @param yaoWuXing 爻的五行
 * @param gongWuXing 宫的五行
 */
export declare function wuXingToLiuQin(yaoWuXing: WuXing, gongWuXing: WuXing): string;

export declare const XINGXIU_28: readonly ["角", "亢", "氐", "房", "心", "尾", "箕", "斗", "牛", "女", "虚", "危", "室", "壁", "奎", "娄", "胃", "昴", "毕", "觜", "参", "井", "鬼", "柳", "星", "张", "翼", "轸"];

/** 单爻完整数据 */
export declare interface YaoData {
    position: number;
    yaoValue: YaoValue;
    isMoving: boolean;
    naJia: string;
    naYin?: string;
    wuXing: WuXing;
    liuQin: LiuQin;
    liuShou: LiuShou;
    shiYing: ShiYingMark;
    xingXiu?: string;
    suoBo?: string;
    suiXian?: SuiXianRange;
}

/** 6爻字符串，从初爻到上爻，如 "778879" */
export declare type YaoString = string;

/**
 * 周易六爻筮法类型定义
 */
/** 爻值：6=老阴(动), 7=少阳(静), 8=少阴(静), 9=老阳(动) */
export declare type YaoValue = 6 | 7 | 8 | 9;

export { }
