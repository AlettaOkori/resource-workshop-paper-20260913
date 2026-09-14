import React, { useEffect, useMemo, useRef, useState } from "react";

const chapters = [
  {
    nav: "缘溪桃林", title: "缘溪行舟，偶遇桃林", stage: "开篇奇遇",
    original: "晋太元中，武陵人捕鱼为业。缘溪行，忘路之远近。忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。渔人甚异之，复前行，欲穷其林。",
    translation: "东晋太元年间，一位武陵渔人顺溪而行，忘记了路程远近。忽然遇见绵延数百步的桃花林，芳草鲜嫩，落花纷飞。他十分惊异，便继续前行，想走到桃林尽头。",
    theme: "渔人偶然脱离日常轨迹，邂逅纯净奇景。“忘路之远近”与“甚异之”共同铺下悬念，引出对未知理想世界的追寻。",
    image: "", video: "./assets/media/nxwQwy4qu2mSdoHyYY82Y5.mp4",
    spots: [["落英缤纷", "夹岸桃林无有杂树，花瓣随风落入溪流。"], ["欲穷其林", "渔人被奇景吸引，决定继续溯流而上。"]],
  },
  {
    nav: "穿洞入山", title: "穿洞入山，初入桃源", stage: "探秘入境",
    original: "林尽水源，便得一山，山有小口，仿佛若有光。便舍船，从口入。初极狭，才通人。复行数十步，豁然开朗。",
    translation: "桃林尽头正是溪水源头，山间有个小洞口，隐约透着光。渔人离船入洞，起初狭窄得只能容一人通过；又走数十步，眼前突然开阔明亮。",
    theme: "从“初极狭”到“豁然开朗”，明暗与空间的强烈对比完成了现实世界到理想国度的过渡，突出桃源的隐秘和独特。",
    image: "/chapters/chapter-02.png", video: "./assets/media/iXrebxDR8ssxhjdykDFUqj.mp4",
    spots: [["山有小口", "幽暗洞口仅容一人通行，微光从深处透来。"], ["豁然开朗", "穿过狭长山洞，一片开阔天地迎面展开。"]],
  },
  {
    nav: "桃源盛景", title: "桃源盛景，安居乐业", stage: "环境风貌",
    original: "土地平旷，屋舍俨然，有良田、美池、桑竹之属。阡陌交通，鸡犬相闻。其中往来种作，男女衣着，悉如外人。黄发垂髫，并怡然自乐。",
    translation: "这里土地平坦，房屋整齐，有良田、美池、桑竹。田间小路交错，鸡犬之声相闻。人们往来耕作，老人和孩子都安适愉悦。",
    theme: "田地规整、物产丰饶、邻里和睦，百姓劳作有序、老少安乐。作者以具体生活图景勾勒出安宁、自足的理想社会。",
    image: "/chapters/chapter-03.png", video: "./assets/media/q3gVWvQ623ayH6jbxy8uLf.mp4",
    spots: [["阡陌交通", "田间小路交错相通，屋舍与良田彼此相连。"], ["怡然自乐", "老人安坐、孩童嬉戏，桃源众人各得其乐。"]],
  },
  {
    nav: "乡民做客", title: "乡民好客，与世隔绝", stage: "人文奇遇",
    original: "见渔人，乃大惊，问所从来。具答之。便要还家，设酒杀鸡作食……此中人语云：‘不足为外人道也。’",
    translation: "桃源人见到渔人十分惊讶，热情邀他回家，摆酒杀鸡款待。众人询问外界世事，听后感叹惋惜；临别时又嘱咐他不要向外人说起这里。",
    theme: "乡民淳朴热情，却因躲避乱世而与外界断绝往来。他们的“叹惋”反衬世间动荡，“不足为外人道”则为寻而不得埋下伏笔。",
    image: "/chapters/chapter-04.png", video: "./assets/media/QRH5B7ezWxPMHbtx7NgNG5.mp4",
    spots: [["设酒作食", "村民围坐设宴，以最质朴的方式款待远客。"], ["不知有汉", "与世隔绝的人们，对外界朝代更迭全然不知。"]],
  },
  {
    nav: "出源寻访", title: "出源记路，寻觅无踪", stage: "出界寻访",
    original: "既出，得其船，便扶向路，处处志之。及郡下，诣太守，说如此。太守即遣人随其往，寻向所志，遂迷，不复得路。",
    translation: "渔人离开桃源，找到小船，沿途处处留下标记。回到郡城后，他把奇遇禀告太守；众人循着标记寻找，却迷失方向，再也找不到入口。",
    theme: "标记本应把奇遇变成可复寻的路线，却最终全部失效。桃花源由此显露出虚幻缥缈、无法被世俗复制和占有的本质。",
    image: "/chapters/chapter-05.png", video: "./assets/media/m5rMrCXLF9jeMPvRd3Hbmk.mp4",
    spots: [["处处志之", "渔人沿岸留下标记，希望将来能够重返。"], ["不复得路", "山水被迷雾重新遮蔽，所有路径都失去方向。"]],
  },
  {
    nav: "名士绝响", title: "名士寻访，终成绝响", stage: "收尾留白",
    original: "南阳刘子骥，高尚士也，闻之，欣然规往。未果，寻病终。后遂无问津者。",
    translation: "南阳名士刘子骥听说此事，高兴地计划前往寻访，却未能实现，不久病逝。从此以后，再也没有探寻桃花源的人。",
    theme: "世人向往桃源，却无人能再次寻得。结尾以空寂留白寄托对理想社会的向往，也流露出理想难以在现实中实现的怅惘。",
    image: "/chapters/chapter-06.png", video: "./assets/media/VHqkFZ6WVSVcTMiRxuGwf7.mp4",
    spots: [["欣然规往", "高尚之士遥望群山，仍相信桃源可能存在。"], ["后无问津", "云雾归于寂静，通往理想世界的道路成为绝响。"]],
  },
];

const villageDialogue = {
  root: { answer: "老者放下酒盏，含笑拱手：“远客既至，但问无妨。”", options: [["你们为何避居于此？", "origin"], ["桃源里的日子如何？", "life"], ["为何嘱咐我不要外传？", "secret"]] },
  origin: { answer: "“先世为避秦时战乱，携妻子乡人来到这处绝境。路远山深，久而久之，便与外界断了往来。”", options: [["这里从何时不与外界往来？", "originTime"], ["你们还知道外面的朝代吗？", "dynasty"]] },
  originTime: { answer: "“祖辈入山以后，便无人再出。岁月只随着花开、稻熟计算，外面的年号，于我们已没有什么分别。”", options: [["继续问朝代之事", "dynasty"], ["换一个话题", "root"]] },
  dynasty: { answer: "“秦之后还有何世？我们只听祖辈讲过旧事，竟不知后来有汉，更不知魏晋。”", options: [["原来如此，再问别的", "root"]] },
  life: { answer: "“这里有田可耕、有桑竹可用。邻里彼此照应，老人安养，孩子嬉游，日子虽平淡，却不受兵乱惊扰。”", options: [["田地与收成如何分配？", "harvest"], ["老人和孩子平日做什么？", "daily"]] },
  harvest: { answer: "“各家照料各家的田，也会一同修渠、收谷。若谁家人手不足，乡邻便来相助，丰歉都不让一家独担。”", options: [["再问村中日常", "daily"], ["换一个话题", "root"]] },
  daily: { answer: "“老者教孩子识草木、记节气，也讲祖辈入山的故事；孩子们放鸡逐犬，沿着田埂玩耍。”", options: [["我还想问别的", "root"]] },
  secret: { answer: "“外世纷争未息。若人人循名逐利而来，这片安宁便难以保全。因此只愿你记得此间，不必向外张扬。”", options: [["若有外人误入，你们会赶走他吗？", "outsider"], ["我还能再回来吗？", "return"]] },
  outsider: { answer: "“既是偶然来客，自会以酒食相待；若带着占有之心而来，纵有沿途标记，也未必还能寻到这里。”", options: [["那我还能回来吗？", "return"], ["换一个话题", "root"]] },
  return: { answer: "老者望向溪流，轻声道：“桃源并不拒人，只是来路随人心而变。若缘分仍在，自会重逢。”", options: [["向长者道谢，再问别的", "root"]] },
};

export default function Home() {
  const [active, setActive] = useState(0);
  const [found, setFound] = useState([]);
  const [spot, setSpot] = useState(null);
  const [reading, setReading] = useState(false);
  const [readingTab, setReadingTab] = useState("original");
  const [immersive, setImmersive] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [maxReached, setMaxReached] = useState(-1);
  const [transitioning, setTransitioning] = useState(false);
  const [journeyVideo, setJourneyVideo] = useState(null);
  const [pendingVideo, setPendingVideo] = useState(null);
  const [pendingReady, setPendingReady] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [dialogueNode, setDialogueNode] = useState("root");
  const [dialogueMessages, setDialogueMessages] = useState([]);
  const [introEnabled, setIntroEnabled] = useState(false);
  const [introReady, setIntroReady] = useState(false);
  const introVideoRef = useRef(null);
  const musicRef = useRef(null);
  const dialogueLogRef = useRef(null);
  const completedVideoRef = useRef(null);
  const chapter = chapters[active];
  const nextTarget = hasStarted ? (active + 1) % chapters.length : 0;
  const nextJourneyVideo = chapters[nextTarget].video;

  const petals = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ id: i, left: `${(i * 37 + 8) % 100}%`, delay: `${-(i * 1.7)}s`, duration: `${8 + (i % 6)}s`, size: `${7 + (i % 4) * 2}px` })), []);

  useEffect(() => {
    let timer = null;
    let activated = false;
    const events = ["pointermove", "pointerdown", "touchstart", "keydown"];
    const removeInteractionListeners = () => {
      events.forEach(type => window.removeEventListener(type, activate));
    };
    const enableIntro = () => {
      if (activated) return;
      activated = true;
      if (timer !== null) window.clearTimeout(timer);
      removeInteractionListeners();
      setIntroEnabled(true);
    };
    function activate(event) {
      if (event.isTrusted) enableIntro();
    }
    const scheduleFallback = () => {
      timer = window.setTimeout(enableIntro, 12000);
    };
    events.forEach(type => window.addEventListener(type, activate, { once: true, passive: type === "touchstart" || type === "pointermove" }));
    if (document.readyState === "complete") scheduleFallback();
    else window.addEventListener("load", scheduleFallback, { once: true });
    return () => {
      removeInteractionListeners();
      window.removeEventListener("load", scheduleFallback);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!introEnabled || !introVideoRef.current) return;
    const video = introVideoRef.current;
    video.load();
    void video.play().catch(() => undefined);
  }, [introEnabled]);

  useEffect(() => {
    const key = (event) => {
      if (event.key === "ArrowRight" && hasStarted) { const target = Math.min(maxReached, active + 1); setPendingVideo(null); setPendingReady(false); setJourneyVideo(chapters[target].video); setTransitioning(false); setTransitionTarget(null); setActive(target); }
      if (event.key === "ArrowLeft" && hasStarted) { const target = Math.max(0, active - 1); setPendingVideo(null); setPendingReady(false); setJourneyVideo(chapters[target].video); setTransitioning(false); setTransitionTarget(null); setActive(target); }
      if (event.key === "Escape") { setSpot(null); setReading(false); setDialogueOpen(false); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, hasStarted, maxReached]);

  useEffect(() => { setSpot(null); setReading(false); setDialogueOpen(false); setTransitioning(false); }, [active]);
  useEffect(() => {
    if (dialogueOpen) dialogueLogRef.current?.scrollTo({ top: dialogueLogRef.current.scrollHeight, behavior: "smooth" });
  }, [dialogueOpen, dialogueMessages]);

  useEffect(() => () => {
    musicRef.current?.pause();
    musicRef.current = null;
  }, []);

  useEffect(() => {
    const syncVideoPlayback = () => {
      document.querySelectorAll(".chapter-video").forEach(video => {
        if (document.hidden) video.pause();
        else if (video.paused && !video.ended && video.dataset.autoplay === "true") void video.play().catch(() => undefined);
      });
    };
    document.addEventListener("visibilitychange", syncVideoPlayback);
    syncVideoPlayback();
    return () => document.removeEventListener("visibilitychange", syncVideoPlayback);
  }, []);

  useEffect(() => {
    if (document.hidden) document.querySelectorAll(".chapter-video").forEach(video => video.pause());
  }, [active, hasStarted, journeyVideo, pendingVideo]);

  useEffect(() => {
    if (!pendingVideo || !transitioning) return;
    const video = Array.from(document.querySelectorAll("video[data-journey-video]")).find(item => item.dataset.journeyVideo === pendingVideo);
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [pendingVideo, transitioning]);

  useEffect(() => {
    if (!journeyVideo || transitioning) return;
    if (completedVideoRef.current === journeyVideo) {
      completedVideoRef.current = null;
      return;
    }
    const video = Array.from(document.querySelectorAll("video[data-journey-video]")).find(item => item.dataset.journeyVideo === journeyVideo);
    if (video && Number.isFinite(video.duration)) video.currentTime = Math.max(0, video.duration - .05);
  }, [journeyVideo, transitioning]);

  const toggleSound = async () => {
    let music = musicRef.current;
    if (!music) {
      music = new Audio("./assets/media/7h3E6vbjDbdvBRLWfDBWrP.mp3");
      music.loop = true;
      music.preload = "auto";
      music.volume = 0.8;
      musicRef.current = music;
    }

    if (!music.paused) {
      music.pause();
      setSoundOn(false);
      return;
    }

    try {
      await music.play();
      setSoundOn(true);
    } catch {
      setSoundOn(false);
    }
  };
  const discover = (index) => {
    const key = `${active}-${index}`;
    setSpot(index);
    setFound(old => old.includes(key) ? old : [...old, key]);
  };

  const finishJourney = () => {
    const target = transitionTarget;
    const completedVideo = pendingVideo;
    completedVideoRef.current = completedVideo;
    setTransitioning(false);
    setTransitionTarget(null);
    setPendingVideo(null);
    setPendingReady(false);
    if (completedVideo) setJourneyVideo(completedVideo);
    if (target === null) return;
    setActive(target);
    setMaxReached(value => Math.max(value, target));
    if (target === 0) setHasStarted(true);
  };

  const handleJourneyError = () => {
    setPendingVideo(null);
    setPendingReady(false);
    setTransitionTarget(null);
    setTransitioning(false);
  };

  const goToChapter = (index) => {
    completedVideoRef.current = null;
    setPendingVideo(null);
    setPendingReady(false);
    setJourneyVideo(chapters[index].video);
    setTransitioning(false);
    setTransitionTarget(null);
    setActive(index);
    setHasStarted(true);
    setMaxReached(value => Math.max(value, index));
  };

  const continueJourney = () => {
    if (transitioning) return;
    const target = hasStarted ? (active + 1) % chapters.length : 0;
    const video = chapters[target].video;
    setTransitionTarget(target);
    if (video) {
      setPendingReady(false);
      setPendingVideo(video);
      setTransitioning(true);
    } else {
      setPendingVideo(null);
      setPendingReady(false);
      setJourneyVideo(null);
      setActive(target);
      setMaxReached(value => Math.max(value, target));
      setTransitionTarget(null);
    }
  };

  const resetDialogue = () => {
    setDialogueNode("root");
    setDialogueMessages([{ role: "elder", text: villageDialogue.root.answer }]);
  };

  const openDialogue = () => {
    setReading(false);
    setSpot(null);
    if (!dialogueMessages.length) resetDialogue();
    setDialogueOpen(true);
  };

  const chooseDialogue = (question, nextId) => {
    const answer = nextId === "root" ? "“远客还想知道些什么？”" : villageDialogue[nextId].answer;
    setDialogueMessages(messages => [...messages, { role: "visitor", text: question }, { role: "elder", text: answer }]);
    setDialogueNode(nextId);
  };

  return (
    <main className={`experience ${hasStarted ? "started" : ""} ${immersive ? "immersive" : ""} ${transitioning ? "transitioning" : ""}`} onPointerMove={(e) => setCursor({ x: e.clientX / window.innerWidth - .5, y: e.clientY / window.innerHeight - .5 })}>
      <div className="paint" />
      {!journeyVideo && !hasStarted && <>
        <img className="chapter-poster intro-poster" src="./assets/media/NmkC5KUAWSVVvaxJr9diS8.jpg" alt="" aria-hidden="true" />
        <video ref={introVideoRef} className="chapter-video intro-video" autoPlay muted loop playsInline preload="none" poster="./assets/media/NmkC5KUAWSVVvaxJr9diS8.jpg" data-autoplay={introEnabled ? "true" : "false"} aria-label="桃花源记首页动态背景" onCanPlay={() => setIntroReady(true)} onPlaying={() => setIntroReady(true)} style={{ opacity: introReady ? 1 : 0, transition: "opacity .35s ease" }}>
          {introEnabled && <source src="./assets/media/s43k2GMkWMrYbpMyFzRBfD.mp4" type="video/mp4" />}
        </video>
      </>}
      {[journeyVideo, pendingVideo ?? nextJourneyVideo].filter((src, index, list) => Boolean(src) && list.indexOf(src) === index).map(src => {
        const isPending = src === pendingVideo && transitioning;
        const isCurrent = src === journeyVideo;
        const isPreloading = !isCurrent && !isPending;
        return <video key={src} className={isPreloading ? "video-preloader" : `chapter-video ${isPending ? `pending-video ${pendingReady ? "ready" : ""}` : ""}`} autoPlay={isPending} muted playsInline preload={isPreloading && !hasStarted ? "none" : "auto"} data-autoplay={isPending ? "true" : "false"} data-journey-video={src} aria-hidden={isPreloading || undefined} tabIndex={isPreloading ? -1 : undefined} aria-label={isPreloading ? undefined : isPending ? "章节前行动画" : `${chapter.title}视频尾帧`} onPlaying={isPending ? () => setPendingReady(true) : undefined} onLoadedMetadata={(event) => { const video = event.currentTarget; if (isCurrent && !transitioning && Number.isFinite(video.duration)) video.currentTime = Math.max(0, video.duration - .05); }} onEnded={isPending ? finishJourney : undefined} onError={isPending ? handleJourneyError : isCurrent ? () => setJourneyVideo(current => current === src ? null : current) : undefined}>
          <source src={src} type="video/mp4" />
        </video>;
      })}
      <div className="wash" /><div className="sun-haze" />
      <div className="petals" aria-hidden="true">{petals.map(p => <i key={p.id} style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, width: p.size, height: p.size }} />)}</div>

      <header className="title-block" aria-label="桃花源记"><img className="title-art" src="./assets/media/L4Y98PNhxBQrRPGKKi8hA3.png" alt="桃花源记 · 古文幻境漫游之" /><p>陶渊明<br />〈晋〉</p></header>
      <div className="module-mark"><strong>{chapter.title}</strong></div>

      <button className="explore-tab" onClick={() => setReading(true)}><span className="knot">❀</span><b>展开分层解读</b><span>卷</span></button>

      {active === 3 && journeyVideo === "./assets/media/QRH5B7ezWxPMHbtx7NgNG5.mp4" && !transitioning && <button className="villager-talk" type="button" onClick={openDialogue} aria-expanded={dialogueOpen} aria-controls="villager-dialogue"><span className="villager-mark">问</span><span className="villager-label"><b>村民</b><small>与长者对话</small></span></button>}

      {[0, 1].map(i => <button key={`${active}-${i}`} className={`hotspot spot-${i} ${found.includes(`${active}-${i}`) ? "found" : ""}`} onClick={() => discover(i)} aria-label={`探索：${chapter.spots[i][0]}`}><span /></button>)}

      <section className="journey" aria-live="polite">
        <button className="continue" onClick={continueJourney} disabled={transitioning}>
          <i aria-hidden="true">❦</i>
          <span className="continue-copy">
            <b>{!hasStarted ? "开始探索" : active === chapters.length - 1 ? "重入桃源" : "继续前行"}</b>
          </span>
          <i aria-hidden="true">❦</i>
        </button>
        <div className="timeline"><div className="track"><i style={{ width: `${maxReached < 0 ? 0 : active / (chapters.length - 1) * 100}%` }} /></div>{chapters.map((item, i) => { const isActive = hasStarted && active === i && !transitioning; return <button type="button" key={item.nav} className={isActive ? "active" : i < active && i <= maxReached ? "visited" : ""} onClick={() => goToChapter(i)} aria-label={`前往${item.nav}`} aria-current={isActive ? "step" : undefined}><span className="node" /><em>{item.nav}</em></button>; })}</div>
      </section>

      <div className="controls"><button className={soundOn ? "sound-on" : ""} onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? "关闭山水清音" : "播放山水清音"}><span className={soundOn ? "wave" : "wave muted"}>≋</span>{soundOn ? "山水清音" : "开启音乐"}</button><button onClick={() => setImmersive(v => !v)}>{immersive ? "显界" : "隐界"}</button></div>

      {spot !== null && <div className="discovery-card" role="dialog" aria-modal="true"><button className="close" onClick={() => setSpot(null)} aria-label="关闭">×</button><span>画中拾光 · {String(spot + 1).padStart(2, "0")}</span><h2>{chapter.spots[spot][0]}</h2><p>{chapter.spots[spot][1]}</p><small>本章已寻得 {found.filter(k => k.startsWith(`${active}-`)).length} / 2 处画中印记</small></div>}

      {reading && <aside className="reading-panel" role="dialog" aria-modal="true" aria-label={`${chapter.title}分层解读`}><button className="reading-close" onClick={() => setReading(false)} aria-label="关闭解读">×</button><span className="reading-index">第 {active + 1} 模块 · {chapter.stage}</span><h2>{chapter.title}</h2><div className="reading-tabs" role="tablist">{([['original','原文'],['translation','今译'],['theme','主旨']]).map(([key,label]) => <button key={key} className={readingTab === key ? "active" : ""} onClick={() => setReadingTab(key)} role="tab" aria-selected={readingTab === key}>{label}</button>)}</div><p>{chapter[readingTab]}</p><div className="video-hint"><i>◉</i><span>当前使用动态场景尾帧<br /><small>点击时间线节点可查看对应视频的最后一帧</small></span></div></aside>}

      <button className={`dialogue-scrim ${dialogueOpen ? "open" : ""}`} type="button" aria-label="关闭村民对话" onClick={() => setDialogueOpen(false)} />
      <aside className={`dialogue-drawer ${dialogueOpen ? "open" : ""}`} id="villager-dialogue" aria-hidden={!dialogueOpen} aria-label="村民分支对话">
        <header className="dialogue-head"><small>桃源问答 · 村中长者</small><h3>与村民一叙</h3><p>选择问题，听长者讲述桃源往事。</p><button className="dialogue-close" type="button" aria-label="关闭对话" onClick={() => setDialogueOpen(false)}>×</button></header>
        <div className="dialogue-log" ref={dialogueLogRef} aria-live="polite">{dialogueMessages.map((message, index) => <div className={`dialogue-bubble ${message.role}`} key={`${message.role}-${index}`}><small>{message.role === "elder" ? "村中长者" : "武陵渔人"}</small><span>{message.text}</span></div>)}</div>
        <div className="dialogue-options">{villageDialogue[dialogueNode].options.map(([label, nextId]) => <button className="dialogue-option" type="button" key={`${dialogueNode}-${nextId}-${label}`} onClick={() => chooseDialogue(label, nextId)}>{label}</button>)}<button className="dialogue-reset" type="button" onClick={resetDialogue}>重新开始对话</button></div>
      </aside>
    </main>
  );
}
