// GSV 语音模型路径配置文件，涵盖所有角色的 SoVITS/GPT 权重及参考音频
const voiceConfigs = {
    // ========== MyGO!!!!! ==========
    "anon": {
        pth: "SoVITS_weights_v2ProPlus/MyGO_千早爱音_v2pp.pth",
        ckpt: "GPT_weights_v2ProPlus/MyGO_千早爱音_v2pp.ckpt",
        refAudio: "output/anon/カフェで撮った写真……リアクションたったこれだけ～！？しっかり映えてるし、もっと反応もらえると思ったんだけどな～.mp3",
        refText: "カフェで撮った写真……リアクションたったこれだけ～！？しっかり映えてるし、もっと反応もらえると思ったんだけどな～"
    },
    "tomorin": {
        pth: "SoVITS_weights_v2ProPlus/MyGO_高松灯_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/MyGO_高松灯_v2pp.ckpt",   
        refAudio: "output/tomorin/優しいそよちゃん、怒ってるそよちゃん、ババ抜きが上手なそよちゃん、苦手なことがあるそよちゃん……いろんなところがあるから、人間だなって.mp3",               
        refText: "優しいそよちゃん、怒ってるそよちゃん、ババ抜きが上手なそよちゃん、苦手なことがあるそよちゃん……いろんなところがあるから、人間だなって"                         
    },
    "taki": {
        pth: "SoVITS_weights_v2ProPlus/MyGO_椎名立希_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/MyGO_椎名立希_v2pp.ckpt",   
        refAudio: "output/taki/そういう時、ちゃんと気を付けて対応しないと……なんていうか、お店の雰囲気を壊しちゃう気がして…….mp3",               
        refText: "そういう時、ちゃんと気を付けて対応しないと……なんていうか、お店の雰囲気を壊しちゃう気がして……"
    },
    "soyo": {
        pth: "SoVITS_weights_v2ProPlus/MyGO_长崎素世_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/MyGO_长崎素世_v2pp.ckpt",   
        refAudio: "output/soyo/運命だなんて言われたのは、生まれて初めてで……なんだかちょっと、くすぐったくて。あたたかい心地がした.mp3",               
        refText: "運命だなんて言われたのは、生まれて初めてで……なんだかちょっと、くすぐったくて。あたたかい心地がした"
    },
    "rana": {
        pth: "SoVITS_weights_v2ProPlus/MyGO_要乐奈_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/MyGO_要乐奈_v2pp.ckpt",   
        refAudio: "output/rana/抹茶生地に抹茶クリームと抹茶アイスと抹茶チョコ。仕上げにたっぷり抹茶ソース。.mp3",               
        refText: "抹茶生地に抹茶クリームと抹茶アイスと抹茶チョコ。仕上げにたっぷり抹茶ソース。"
    },
    // ========== Mujica ==========
    "sakiko": {
        pth: "SoVITS_weights_v2ProPlus/Mujica_豊川祥子_白_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Mujica_豊川祥子_白_v2pp.ckpt",   
        refAudio: "output/sakiko/(A)あなたと空を見上げるのは、いつも夏でしたわね.wav",               
        refText: "あなたと空を見上げるのは、いつも夏でしたわね"
    },
    "mutsumi": {
        pth: "SoVITS_weights_v2ProPlus/Mujica_若葉睦_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Mujica_若葉睦_v2pp.ckpt",   
        refAudio: "output/mutsumi/ごめんなさい。バンド壊して、ギター下手で、ずっと謝りたかった.wav",               
        refText: "ごめんなさい。バンド壊して、ギター下手で、ずっと謝りたかった"
    },
    "umiri": {
        pth: "SoVITS_weights_v2ProPlus/Mujica_八幡海鈴_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Mujica_八幡海鈴_v2pp.ckpt",   
        refAudio: "output/umiri/(A)世界観という意味では、若葉さんが独自のアプローチでの表現に、成功しているのではないでしょうか.wav",               
        refText: "世界観という意味では、若葉さんが独自のアプローチでの表現に、成功しているのではないでしょうか"
    },
    "uika": {
        pth: "SoVITS_weights_v2ProPlus/Mujica_三角初華_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Mujica_三角初華_v2pp.ckpt",   
        refAudio: "output/uika/(A)ういかは、ひとりで食べるには少し多めのお菓子をつかんで.wav",               
        refText: "ういかは、ひとりで食べるには少し多めのお菓子をつかんで"
    },
    "nyamu": {
        pth: "SoVITS_weights_v2ProPlus/Mujica_祐天寺若麥_乖猫_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Mujica_祐天寺若麥_乖猫_v2pp.ckpt",   
        refAudio: "output/nyamu/(A)仕切るわりには、責任はサキコに取らすようなしゃべり方しかしてなかったもんねー.wav",               
        refText: "仕切るわりには、責任はサキコに取らすようなしゃべり方しかしてなかったもんねー"
    },
    // ========== Roselia ==========
    "yukina": {
        pth: "SoVITS_weights_v2ProPlus/Roselia_湊友希那_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Roselia_湊友希那_v2pp.ckpt",   
        refAudio: "output/yukina/この前、修学旅行に行ってきたのだけれど。練習の合間に、撮った写真を整理しようかと思って.mp3",               
        refText: "この前、修学旅行に行ってきたのだけれど。練習の合間に、撮った写真を整理しようかと思って"
    },
    "mana": {
        pth: "SoVITS_weights_v2ProPlus/純田真奈_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/純田真奈_v2pp.ckpt",   
        refAudio: "output/mana/現場の雰囲気もいいし、優しくて頼れるお姉さんって感じでね。今日も仕事終わりにご飯行く約束してるんだ.wav",               
        refText: "現場の雰囲気もいいし、優しくて頼れるお姉さんって感じでね。今日も仕事終わりにご飯行く約束してるんだ"
    },
    // ========== Poppin'Party ==========
    "kasumi": {
        pth: "SoVITS_weights_v2ProPlus/ppp_戸山香澄_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/ppp_戸山香澄_v2pp.ckpt",   
        refAudio: "output/kasumi/(ZH)ほら、修学旅行でやったりしなかった？布団にもぐって、これまでずっと秘密にしてたこと、みんなで言い合うの！.mp3",               
        refText: "ほら、修学旅行でやったりしなかった？布団にもぐって、これまでずっと秘密にしてたこと、みんなで言い合うの！"
    },
    "arisa": {
        pth: "SoVITS_weights_v2ProPlus/ppp_市ヶ谷有咲_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/ppp_市ヶ谷有咲_v2pp.ckpt",   
        refAudio: "output/arisa/(A1)まあ、私はどうでもいいけど……新しいメンバーが入るなら、知らない人より山吹さんのほうが私は楽かな.mp3",               
        refText: "(A1)まあ、私はどうでもいいけど……新しいメンバーが入るなら、知らない人より山吹さんのほうが私は楽かな"
    },
    "rimi": {
        pth: "SoVITS_weights_v2ProPlus/ppp_牛込里美_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/ppp_牛込里美_v2pp.ckpt",   
        refAudio: "output/rimi/でもね、それでも じっとしてたくなかったから.mp3",               
        refText: "でもね、それでも じっとしてたくなかったから"
    },
    "tae": {
        pth: "SoVITS_weights_v2ProPlus/ppp_花園多惠_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/ppp_花園多惠_v2pp.ckpt",   
        refAudio: "output/tae/あ、イヴにはまだ話してなかったっけ？今有咲、助っ人で楽器店の短期バイトしてくれてるんだ.mp3",               
        refText: "あ、イヴにはまだ話してなかったっけ？今有咲、助っ人で楽器店の短期バイトしてくれてるんだ"
    },
    "saaya": {
        pth: "SoVITS_weights_v2ProPlus/ppp_山吹沙绫_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/ppp_山吹沙绫_v2pp.ckpt",   
        refAudio: "output/saaya/そういうワクワクを、素直に追いかけられるようになったのも……ポピパに、香澄に出会えたからだよ.mp3",               
        refText: "そういうワクワクを、素直に追いかけられるようになったのも……ポピパに、香澄に出会えたからだよ"
    },
    // ========== Pastel*Palettes ==========
    "aya": {
        pth: "SoVITS_weights_v2ProPlus/パスパレ_丸山彩_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/パスパレ_丸山彩_v2pp.ckpt",   
        refAudio: "output/aya/私だけが頑張ったわけじゃないよ。花音ちゃんや紗夜ちゃん、他にもいろんな人が力を合わせて、できあがったしおりだから.mp3",               
        refText: "私だけが頑張ったわけじゃないよ。花音ちゃんや紗夜ちゃん、他にもいろんな人が力を合わせて、できあがったしおりだから"
    },
    "eve": {
        pth: "SoVITS_weights_v2ProPlus/パスパレ_若宮伊芙_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/パスパレ_若宮伊芙_v2pp.ckpt",   
        refAudio: "output/eve/あけましておめでとうございますっ！視聴者のみなさん、私たちが今どこにいるかわかりますか？.mp3",               
        refText: "あけましておめでとうございますっ！視聴者のみなさん、私たちが今どこにいるかわかりますか？"
    },
    "maya": {
        pth: "SoVITS_weights_v2ProPlus/パスパレ_大和麻弥_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/パスパレ_大和麻弥_v2pp.ckpt",   
        refAudio: "output/maya/あの日のライブはたった１曲だけでしたが、そこにぎっしりと詰まっている、ドラマや想いを実感できて嬉しかったというか.mp3",               
        refText: "あの日のライブはたった１曲だけでしたが、そこにぎっしりと詰まっている、ドラマや想いを実感できて嬉しかったというか"
    },
    "hina": {
        pth: "SoVITS_weights_v2ProPlus/パスパレ_冰川日菜_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/パスパレ_冰川日菜_v2pp.ckpt",   
        refAudio: "output/hina/ふんふふふーん、今日は何して過ごそうかなー。ポテト食べに行こうかな？彩ちゃんバイトしてるかなー？.mp3",               
        refText: "ふんふふふーん、今日は何して過ごそうかなー。ポテト食べに行こうかな？彩ちゃんバイトしてるかなー？"
    },
    "chisato": {
        pth: "SoVITS_weights_v2ProPlus/パスパレ_白鷺千聖_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/パスパレ_白鷺千聖_v2pp.ckpt",   
        refAudio: "output/chisato/それじゃあ、仕事に使った荷物もあることだし、各自準備ができたら、ショッピングモールに集まりましょう.mp3",               
        refText: "それじゃあ、仕事に使った荷物もあることだし、各自準備ができたら、ショッピングモールに集まりましょう"
    },
    // ========== Roselia（续） ==========
    "ako": {
        pth: "SoVITS_weights_v2ProPlus/Roselia_宇田川亚子_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Roselia_宇田川亚子_v2pp.ckpt",   
        refAudio: "output/ako/あこが友達紹介キャンペーンの特典をもらうために一緒にやってもらったんだけどね.mp3",               
        refText: "あこが友達紹介キャンペーンの特典をもらうために一緒にやってもらったんだけどね"
    },
    "sayo": {
        pth: "SoVITS_weights_v2ProPlus/Roselia_冰川纱夜_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Roselia_冰川纱夜_v2pp.ckpt",   
        refAudio: "output/sayo/日常の中にある、些細な出来事を美しく描いていて、素敵ですね.mp3",               
        refText: "日常の中にある、些細な出来事を美しく描いていて、素敵ですね"
    },
    "rinko": {
        pth: "SoVITS_weights_v2ProPlus/Roselia_白金燐子_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Roselia_白金燐子_v2pp.ckpt",   
        refAudio: "output/rinko/あこちゃんがいてくれるから、自然に話せるんですけど、二人きりだとちょっと違いますね.mp3",               
        refText: "あこちゃんがいてくれるから、自然に話せるんですけど、二人きりだとちょっと違いますね"
    },
    "lisa": {
        pth: "SoVITS_weights_v2ProPlus/Roselia_今井莉莎_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Roselia_今井莉莎_v2pp.ckpt",   
        refAudio: "output/lisa/アタシもピンうさのファン第一号として応援してるよ。じゃ、アタシ自主練あるからこれで.mp3",               
        refText: "アタシもピンうさのファン第一号として応援してるよ。じゃ、アタシ自主練あるからこれで"
    },
    // ========== Hello, Happy World! ==========
    "kokoro": {
        pth: "SoVITS_weights_v2ProPlus/HHW_弦卷心_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/HHW_弦卷心_v2pp.ckpt",   
        refAudio: "output/kokoro/あこに教えてもらったの！こうしてパレードしながら宣伝すれば、もっとたくさんの人にサーカスのことを知ってもらえるでしょう？.mp3",               
        refText: "あこに教えてもらったの！こうしてパレードしながら宣伝すれば、もっとたくさんの人にサーカスのことを知ってもらえるでしょう？"
    },
    "hagumi": {
        pth: "SoVITS_weights_v2ProPlus/HHW_北泽育美_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/HHW_北泽育美_v2pp.ckpt",   
        refAudio: "output/hagumi/あっ！はぐみ、うっかりしてた！ごめんねりみりん……でも、まだまだ食べられるから心配しないで！.mp3",               
        refText: "あっ！はぐみ、うっかりしてた！ごめんねりみりん……でも、まだまだ食べられるから心配しないで！"
    },
    "kaoru": {
        pth: "SoVITS_weights_v2ProPlus/HHW_濑田薰_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/HHW_濑田薰_v2pp.ckpt",   
        refAudio: "output/kaoru/ありがとう、美咲。心配には及ばないよ。今日はハロハピの活動のために予定を空けているからね.mp3",               
        refText: "ありがとう、美咲。心配には及ばないよ。今日はハロハピの活動のために予定を空けているからね"
    },
    "kanon": {
        pth: "SoVITS_weights_v2ProPlus/HHW_松原花音_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/HHW_松原花音_v2pp.ckpt",   
        refAudio: "output/kanon/あとでみんなで会いにいこっか。定期的にお散歩もしているみたいだから、時間は確認しないといけないけど.mp3",               
        refText: "あとでみんなで会いにいこっか。定期的にお散歩もしているみたいだから、時間は確認しないといけないけど"
    },
    "misaki": {
        pth: "SoVITS_weights_v2ProPlus/HHW_奥泽美咲_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/HHW_奥泽美咲_v2pp.ckpt",   
        refAudio: "output/misaki/この前借りたノート、まだ返してなかったから。そろそろ期末テストも近づいてきたし。はいこれ、ありがと.mp3",               
        refText: "この前借りたノート、まだ返してなかったから。そろそろ期末テストも近づいてきたし。はいこれ、ありがと"
    },
    // ========== Afterglow ==========
    "ran": {
        pth: "SoVITS_weights_v2ProPlus/Afterglow_美竹蘭_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Afterglow_美竹蘭_v2pp.ckpt",   
        refAudio: "output/ran/(A)モカの気持ちが伝わってくるっていうか、あたし達のことをどう思ってるのかとか、音を通じて感じられるような気がして.mp3",               
        refText: "モカの気持ちが伝わってくるっていうか、あたし達のことをどう思ってるのかとか、音を通じて感じられるような気がして"
    },
    "moca": {
        pth: "SoVITS_weights_v2ProPlus/Afterglow_青葉モカ_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Afterglow_青葉モカ_v2pp.ckpt",   
        refAudio: "output/moca/(B)ごはんの最中にスマホはダメってあれだけ言ったでしょ～。そんな子に育てた覚えはありません～.mp3",               
        refText: "ごはんの最中にスマホはダメってあれだけ言ったでしょ～。そんな子に育てた覚えはありません～"
    },
    "himari": {
        pth: "SoVITS_weights_v2ProPlus/Afterglow_上原ひまり_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Afterglow_上原ひまり_v2pp.ckpt",   
        refAudio: "output/himari/(？)ら、蘭！？変なモノを見るような目で見たまま、行かないで～っ！お願いだから、話を聞いて～っ！！.mp3",               
        refText: "ら、蘭！？変なモノを見るような目で見たまま、行かないで～っ！お願いだから、話を聞いて～っ！！"
    },
    "tomoe": {
        pth: "SoVITS_weights_v2ProPlus/Afterglow_宇田川巴_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Afterglow_宇田川巴_v2pp.ckpt",   
        refAudio: "output/tomoe/いやー、楽しかった！なんかだんだん、喋るのに抵抗なくなっていってさ、どんどん話ふくらませちゃったよな！.mp3",               
        refText: "いやー、楽しかった！なんかだんだん、喋るのに抵抗なくなっていってさ、どんどん話ふくらませちゃったよな！"
    },
    "tsugumi": {
        pth: "SoVITS_weights_v2ProPlus/Afterglow_羽沢鶫_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Afterglow_羽沢鶫_v2pp.ckpt",   
        refAudio: "output/tsugumi/いえいえ、そんなことないです！昔の私だったら、緊張しちゃってよくない空気に飲まれちゃってたかもしれないです.mp3",               
        refText: "いえいえ、そんなことないです！昔の私だったら、緊張しちゃってよくない空気に飲まれちゃってたかもしれないです"
    },
    // ========== RAISE A SUILEN ==========
    "rei": {
        pth: "SoVITS_weights_v2ProPlus/RAS_LAYER_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/RAS_LAYER_v2pp.ckpt",   
        refAudio: "output/rei/じゃあ、早速だけど行こうか。パレオ、好きなショップで新作が出たって言ってたし、そこから行く？.mp3",               
        refText: "じゃあ、早速だけど行こうか。パレオ、好きなショップで新作が出たって言ってたし、そこから行く？"
    },
    "pareo": {
        pth: "SoVITS_weights_v2ProPlus/RAS_PAREO_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/RAS_PAREO_v2pp.ckpt",   
        refAudio: "output/pareo/(A)パレオの仕事は、チュチュ様ならびにラスのみなさんが音楽活動に集中できるようパーフェクトな環境をご用意することですっ.mp3",               
        refText: "パレオの仕事は、チュチュ様ならびにラスのみなさんが音楽活動に集中できるようパーフェクトな環境をご用意することですっ"
    },
    "lock": {
        pth: "SoVITS_weights_v2ProPlus/RAS_LOCK_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/RAS_LOCK_v2pp.ckpt",   
        refAudio: "output/lock/ご、誤解ですっ！そういう話もミラドリの皆さんのなかでは一瞬あったみたいですけど、実際引き抜きを持ちかけられたとかではないですっ！.mp3",               
        refText: "ご、誤解ですっ！そういう話もミラドリの皆さんのなかでは一瞬あったみたいですけど、実際引き抜きを持ちかけられたとかではないですっ！"
    },
    "masuki": {
        pth: "SoVITS_weights_v2ProPlus/RAS_MASKING_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/RAS_MASKING_v2pp.ckpt",   
        refAudio: "output/masuki/あの頃の自分たちだったら、イルミネーションを見ても、こんな楽しい気持ちにならなかっただろうなって……そんな話をみんなとしてました.mp3",               
        refText: "あの頃の自分たちだったら、イルミネーションを見ても、こんな楽しい気持ちにならなかっただろうなって……そんな話をみんなとしてました"
    },
    "chu2": {
        pth: "SoVITS_weights_v2ProPlus/RAS_Chu²_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/RAS_Chu²_v2pp.ckpt",   
        refAudio: "output/chu2/(A)ミラドリも、かつては熱い志を持ったバンドだったみたいね。強い想いがなければ、プロになんてなれないわ.mp3",               
        refText: "ミラドリも、かつては熱い志を持ったバンドだったみたいね。強い想いがなければ、プロになんてなれないわ"
    },
    // ========== Morfonica ==========
    "mashiro": {
        pth: "SoVITS_weights_v2ProPlus/モニカ_倉田真白_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/モニカ_倉田真白_v2pp.ckpt",   
        refAudio: "output/mashiro/なんだか、のど自慢大会のステージは、普段のライブで歌う時と会場の雰囲気が全然違ったっていうか…….mp3",               
        refText: "なんだか、のど自慢大会のステージは、普段のライブで歌う時と会場の雰囲気が全然違ったっていうか……"
    },
    "nanami": {
        pth: "SoVITS_weights_v2ProPlus/モニカ_廣町七深_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/モニカ_廣町七深_v2pp.ckpt",   
        refAudio: "output/nanami/広町の目はごまかせないよ～？演奏が終わったあとつーちゃんがガッツポーズしてたのバッチリ見てたからね～.mp3",               
        refText: "広町の目はごまかせないよ～？演奏が終わったあとつーちゃんがガッツポーズしてたのバッチリ見てたからね～"
    },
    "touko": {
        pth: "SoVITS_weights_v2ProPlus/モニカ_桐谷透子_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/モニカ_桐谷透子_v2pp.ckpt",   
        refAudio: "output/touko/あとはモニカのみんなは確定だし、紗夜さんに、おたえさん、それから美咲さんと薫さんにも頼みたいんだよねー.mp3",               
        refText: "あとはモニカのみんなは確定だし、紗夜さんに、おたえさん、それから美咲さんと薫さんにも頼みたいんだよねー"
    },
    "rui": {
        pth: "SoVITS_weights_v2ProPlus/モニカ_八潮瑠唯_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/モニカ_八潮瑠唯_v2pp.ckpt",   
        refAudio: "output/rui/(A)あなたの、その想像力よ。水面が輝いてるところを見て、そこまで想像を広げられるなんて、なかなかできないわ.mp3",               
        refText: "あなたの、その想像力よ。水面が輝いてるところを見て、そこまで想像を広げられるなんて、なかなかできないわ"
    },
    "tsukushi": {
        pth: "SoVITS_weights_v2ProPlus/モニカ_二葉筑紫_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/モニカ_二葉筑紫_v2pp.ckpt",   
        refAudio: "output/tsukushi/ええと、西の広場のゴブリンさんにポポクテ草を届けて、迷子のゴブリンさんを探して、そのあとは～…….mp3",               
        refText: "ええと、西の広場のゴブリンさんにポポクテ草を届けて、迷子のゴブリンさんを探して、そのあとは～……"
    },
};

module.exports = voiceConfigs;
