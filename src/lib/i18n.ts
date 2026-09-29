/**
 * Vernacular dictionary — Marathi, Hindi, English.
 *
 * PS 26229 requires Marathi and Hindi at minimum and "a genuinely usable
 * interface for users with limited literacy". Two consequences shape this file:
 *
 *  1. Strings are written to be SPOKEN, not read. They are short, use the words
 *     a scrap collector actually uses (भाव, माल, तोल) rather than formal
 *     register (मूल्य, सामग्री, वजन), and avoid subordinate clauses that a TTS
 *     engine mangles.
 *
 *  2. Marathi is the DEFAULT, not English. The sponsor is in Nagpur and the
 *     PS names Marathi first. An English-default app that offers Marathi in a
 *     settings menu has not met the requirement.
 *
 * ⚠️ Translation review: these were written to be idiomatic rather than literal.
 * Before the demo, have a native Marathi speaker read every `safety.*` string
 * aloud — those are the ones that must land, and a stilted safety warning is
 * worse than none.
 */

export type Locale = 'mr' | 'hi' | 'en';

export const LOCALES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
];

export const DEFAULT_LOCALE: Locale = 'mr';

/** BCP-47 tags for speechSynthesis. See speech.ts for the fallback chain. */
export const SPEECH_LANG: Record<Locale, string> = {
  mr: 'mr-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

type Dict = Record<string, string>;

const en: Dict = {
  'app.name': 'Kabadiwala Connect',
  'app.tagline': 'Fair price. Safe work. Direct to recycler.',

  'nav.home': 'Home',
  'nav.newLot': 'New Lot',
  'nav.prices': 'Prices',
  'nav.earnings': 'Earnings',
  'nav.safety': 'Safety',

  'action.continue': 'Continue',
  'action.back': 'Back',
  'action.confirm': 'Confirm',
  'action.cancel': 'Cancel',
  'action.retake': 'Retake photo',
  'action.takePhoto': 'Take photo',
  'action.listen': 'Listen',
  'action.next': 'Next',
  'action.done': 'Done',
  'action.sell': 'Sell this lot',
  'action.sellAnyway': 'Sell anyway',
  'action.showQr': 'Show handover code',
  'action.scanQr': 'Scan code',

  'onboard.chooseLanguage': 'Choose your language',
  'onboard.welcome': 'Welcome',
  'onboard.enterPhone': 'Your phone number',
  'onboard.whereYouWork': 'Where do you work?',

  'lot.title': 'New lot',
  'lot.whatIsIt': 'What did you collect?',
  'lot.howMuch': 'How much does it weigh?',
  'lot.kg': 'kg',
  'lot.estimate': 'Estimated value',
  'lot.estimateRange': 'Fair range',
  'lot.aiGuess': 'Looks like',
  'lot.aiConfidence': 'confidence',
  'lot.notRight': 'Not right? Choose yourself',
  'lot.created': 'Lot saved',
  'lot.savedOffline': 'Saved on your phone. Will send when you have network.',

  'price.title': "Today's rates",
  'price.perKg': 'per kg',
  'price.trendUp': 'Price going up',
  'price.trendDown': 'Price going down',
  'price.trendFlat': 'Price steady',
  'price.fairBand': 'Fair price range',
  'price.yourOffer': 'Offer you got',
  'price.tooLow': 'This offer is LOW. You should get more.',
  'price.fair': 'This is a fair price.',
  'price.good': 'This is a good price.',

  'recycler.title': 'Authorized recyclers near you',
  'recycler.verified': 'Authorization valid',
  'recycler.expired': 'Authorization EXPIRED',
  'recycler.distance': 'away',
  'recycler.pickup': 'Free pickup',
  'recycler.noPickup': 'You must deliver',
  'recycler.offers': 'Offers',

  'handover.title': 'Handover',
  'handover.showToRecycler': 'Show this code to the recycler',
  'handover.verified': 'Verified',
  'handover.signatureOk': 'Signature checked — this record is genuine',
  'handover.signatureBad': 'Signature does NOT match. Do not accept.',
  'handover.worksOffline': 'This works without network',

  'trust.title': 'Your accuracy',
  'trust.good': 'Your weights match the weighbridge closely. Recyclers trust you.',
  'trust.ok': 'Your weights are usually close. Weigh carefully for a better rate.',
  'trust.poor': 'Your weights often differ from the weighbridge. Check your scale.',
  'trust.help': 'Accurate weights get you priority and better offers.',
  'earnings.title': 'My earnings',
  'earnings.paid': 'Received',
  'earnings.pending': 'Still to come',
  'earnings.total': 'Total',
  'earnings.thisWeek': 'This week',
  'earnings.thisMonth': 'This month',
  'earnings.passport': 'Download my earnings record',

  'sync.pending': 'waiting to send',
  'sync.syncing': 'Sending…',
  'sync.done': 'All sent',
  'sync.offline': 'No network — your work is saved',

  'safety.title': 'Work safely',
  'safety.generic': 'Wear gloves. Keep children away from the material.',
  'safety.cables_no_burn':
    'Do not burn wires. The smoke is poison. Strip them instead — you get a better price.',
  'safety.pcb': 'Do not use acid on boards. It burns your hands and destroys the gold.',
  'safety.pcb_bare': 'Do not burn boards. Sell them whole.',
  'safety.crt': 'Do not break old TVs. The glass can burst and the lead is poison.',
  'safety.lcd': 'Do not break the screen. Handle the backlight tubes carefully.',
  'safety.liion':
    'Do not puncture or heat this battery. Keep it away from fire. It can explode.',
  'safety.lead_acid': 'Acid inside. Do not tip it. Wear gloves and do not touch the liquid.',
  'safety.motors': 'Strong magnets. Keep away from fingers and from your phone.',
  'safety.plastics': 'Do not burn plastic. The smoke damages your lungs.',
  'safety.mixed': 'Sort carefully. Wear gloves.',

  'why.pcb': 'Burning destroys the gold and tantalum inside. Sell whole for more money.',
  'why.pcb_bare': 'Whole boards are worth more than burnt copper.',
  'why.cables': 'Stripped copper sells for much more than burnt copper.',
  'why.crt': 'Authorized recyclers take CRT safely and pay for the lead.',
  'why.lcd': 'Screens contain indium, which is valuable and rare.',
  'why.liion': 'Lithium and cobalt inside are valuable. Authorized recyclers pay for them.',
  'why.lead_acid': 'Lead is fully recyclable and recyclers pay well for it.',
  'why.motors': 'The magnets contain neodymium, a rare and valuable metal.',
  'why.plastics': 'Clean sorted plastic sells for more than mixed plastic.',
  'why.aluminium': 'Clean aluminium has a steady high price.',
  'why.ferrous': 'Sell by weight; keep it free of plastic.',
  'why.mixed': 'Sorting your lot before selling raises the price.',

  'recycler.bestRate': 'Best rate',
  'recycler.outOfArea': 'Outside service area',
  'view.list': 'List',
  'view.map': 'Map',
  'recycler.aggregator': 'Aggregator',
  'recycler.transport': 'transport',
  'recycler.none': 'No recycler nearby takes this material.',
  'epr.title': 'Extra from traceable handover',
  'epr.bonus': 'EPR bonus',
  'epr.why': 'Licensed recyclers can claim a recycling certificate for this lot — but only because your handover is documented and signed.',
  'epr.notEligible': 'No EPR bonus — this buyer is not a licensed recycler.',
  'epr.assumption': 'Estimated at ₹{rate}/kg certificate value. Indicative, not a quoted price.',
  'epr.withBonus': 'With EPR bonus',
  'offers.title': 'Offers you received',
  'offers.accept': 'Take this offer',
  'offers.countered': 'Changed price',
  'offers.none': 'No offers yet. Recyclers will respond soon.',
  'econ.more': 'more',
  'econ.compare': 'Authorized recycler {formal} vs nearest aggregator {agg} — after transport.',
  'price.observations': '{n} records',
  'price.estimateOnly': 'estimate only',
  'price.source': 'Rates are a rolling median of recent sales and recycler rates.',

  'material.pcb_populated': 'Circuit board (with parts)',
  'material.pcb_bare': 'Bare board',
  'material.cables': 'Wire / cable',
  'material.crt': 'Old TV / monitor',
  'material.lcd_panel': 'LCD screen',
  'material.battery_liion': 'Lithium battery',
  'material.battery_lead_acid': 'Big battery (lead)',
  'material.motors_magnets': 'Motor / magnet',
  'material.plastics_mixed': 'Plastic',
  'material.aluminium': 'Aluminium',
  'material.ferrous': 'Iron',
  'material.ewaste_mixed': 'Mixed e-waste',
};

const hi: Dict = {
  'app.name': 'कबाड़ीवाला कनेक्ट',
  'app.tagline': 'सही भाव. सुरक्षित काम. सीधे रिसाइकलर तक.',

  'nav.home': 'होम',
  'nav.newLot': 'नया माल',
  'nav.prices': 'भाव',
  'nav.earnings': 'कमाई',
  'nav.safety': 'सुरक्षा',

  'action.continue': 'आगे बढ़ो',
  'action.back': 'पीछे',
  'action.confirm': 'पक्का करो',
  'action.cancel': 'रहने दो',
  'action.retake': 'दोबारा फोटो लो',
  'action.takePhoto': 'फोटो लो',
  'action.listen': 'सुनो',
  'action.next': 'अगला',
  'action.done': 'हो गया',
  'action.sell': 'यह माल बेचो',
  'action.sellAnyway': 'फिर भी बेचो',
  'action.showQr': 'कोड दिखाओ',
  'action.scanQr': 'कोड स्कैन करो',

  'onboard.chooseLanguage': 'अपनी भाषा चुनो',
  'onboard.welcome': 'स्वागत है',
  'onboard.enterPhone': 'आपका मोबाइल नंबर',
  'onboard.whereYouWork': 'आप कहाँ काम करते हो?',

  'lot.title': 'नया माल',
  'lot.whatIsIt': 'आपने क्या इकट्ठा किया?',
  'lot.howMuch': 'कितना वज़न है?',
  'lot.kg': 'किलो',
  'lot.estimate': 'अंदाज़न दाम',
  'lot.estimateRange': 'सही भाव की रेंज',
  'lot.aiGuess': 'यह लगता है',
  'lot.aiConfidence': 'भरोसा',
  'lot.notRight': 'सही नहीं? खुद चुनो',
  'lot.created': 'माल सेव हो गया',
  'lot.savedOffline': 'आपके फोन में सेव है. नेटवर्क आते ही भेज देंगे.',

  'price.title': 'आज के भाव',
  'price.perKg': 'प्रति किलो',
  'price.trendUp': 'भाव बढ़ रहा है',
  'price.trendDown': 'भाव गिर रहा है',
  'price.trendFlat': 'भाव स्थिर है',
  'price.fairBand': 'सही भाव की रेंज',
  'price.yourOffer': 'आपको मिला भाव',
  'price.tooLow': 'यह भाव कम है. आपको ज़्यादा मिलना चाहिए.',
  'price.fair': 'यह भाव ठीक है.',
  'price.good': 'यह भाव अच्छा है.',

  'recycler.title': 'आपके पास के मान्यता प्राप्त रिसाइकलर',
  'recycler.verified': 'मान्यता वैध है',
  'recycler.expired': 'मान्यता खत्म हो चुकी है',
  'recycler.distance': 'दूर',
  'recycler.pickup': 'मुफ़्त पिकअप',
  'recycler.noPickup': 'आपको पहुँचाना होगा',
  'recycler.offers': 'भाव देता है',

  'handover.title': 'माल सौंपना',
  'handover.showToRecycler': 'यह कोड रिसाइकलर को दिखाओ',
  'handover.verified': 'जाँच हो गई',
  'handover.signatureOk': 'हस्ताक्षर सही है — यह रिकॉर्ड असली है',
  'handover.signatureBad': 'हस्ताक्षर गलत है. मत लो.',
  'handover.worksOffline': 'यह बिना नेटवर्क के भी चलता है',

  'trust.title': 'आपकी सटीकता',
  'trust.good': 'आपका वज़न तराजू से मिलता है. रिसाइकलर आप पर भरोसा करते हैं.',
  'trust.ok': 'आपका वज़न ज़्यादातर सही रहता है. ध्यान से तोलें, भाव बेहतर मिलेगा.',
  'trust.poor': 'आपका वज़न अक्सर तराजू से अलग निकलता है. अपना तराजू जाँचें.',
  'trust.help': 'सही वज़न से आपको पहले मौका और बेहतर भाव मिलता है.',
  'earnings.title': 'मेरी कमाई',
  'earnings.paid': 'मिल गया',
  'earnings.pending': 'आना बाकी है',
  'earnings.total': 'कुल',
  'earnings.thisWeek': 'इस हफ़्ते',
  'earnings.thisMonth': 'इस महीने',
  'earnings.passport': 'मेरी कमाई का रिकॉर्ड डाउनलोड करो',

  'sync.pending': 'भेजना बाकी',
  'sync.syncing': 'भेज रहे हैं…',
  'sync.done': 'सब भेज दिया',
  'sync.offline': 'नेटवर्क नहीं है — आपका काम सेव है',

  'safety.title': 'सुरक्षित काम करो',
  'safety.generic': 'दस्ताने पहनो. बच्चों को माल से दूर रखो.',
  'safety.cables_no_burn':
    'तार मत जलाओ. धुआँ ज़हर है. छीलकर बेचो — ज़्यादा दाम मिलेगा.',
  'safety.pcb': 'बोर्ड पर तेज़ाब मत डालो. हाथ जलते हैं और सोना बर्बाद होता है.',
  'safety.pcb_bare': 'बोर्ड मत जलाओ. पूरा बेचो.',
  'safety.crt': 'पुराना टीवी मत तोड़ो. काँच फट सकता है और सीसा ज़हर है.',
  'safety.lcd': 'स्क्रीन मत तोड़ो. अंदर की ट्यूब सावधानी से निकालो.',
  'safety.liion':
    'इस बैटरी में छेद मत करो, गरम मत करो. आग से दूर रखो. यह फट सकती है.',
  'safety.lead_acid': 'अंदर तेज़ाब है. उलटो मत. दस्ताने पहनो, तरल मत छुओ.',
  'safety.motors': 'तेज़ चुंबक है. उँगलियों और फोन से दूर रखो.',
  'safety.plastics': 'प्लास्टिक मत जलाओ. धुआँ फेफड़े खराब करता है.',
  'safety.mixed': 'ध्यान से छाँटो. दस्ताने पहनो.',

  'why.pcb': 'जलाने से अंदर का सोना और टैंटलम नष्ट हो जाता है. पूरा बेचो, ज़्यादा पैसा मिलेगा.',
  'why.pcb_bare': 'पूरा बोर्ड जले हुए ताँबे से ज़्यादा कीमती है.',
  'why.cables': 'छीला हुआ ताँबा जले हुए ताँबे से कहीं ज़्यादा बिकता है.',
  'why.crt': 'मान्यता प्राप्त रिसाइकलर CRT सुरक्षित तरीके से लेते हैं और सीसे का दाम देते हैं.',
  'why.lcd': 'स्क्रीन में इंडियम होता है, जो कीमती और दुर्लभ है.',
  'why.liion': 'अंदर लिथियम और कोबाल्ट कीमती हैं. मान्यता प्राप्त रिसाइकलर इनका दाम देते हैं.',
  'why.lead_acid': 'सीसा पूरा रिसाइकल होता है और अच्छा दाम मिलता है.',
  'why.motors': 'चुंबक में नियोडिमियम होता है, जो दुर्लभ और कीमती धातु है.',
  'why.plastics': 'साफ़ छँटा प्लास्टिक मिले-जुले से ज़्यादा बिकता है.',
  'why.aluminium': 'साफ़ एल्युमिनियम का भाव हमेशा अच्छा रहता है.',
  'why.ferrous': 'वज़न से बेचो; प्लास्टिक अलग कर दो.',
  'why.mixed': 'बेचने से पहले छाँट लो तो भाव बढ़ जाता है.',

  'recycler.bestRate': 'सबसे अच्छा भाव',
  'recycler.outOfArea': 'सेवा क्षेत्र के बाहर',
  'view.list': 'सूची',
  'view.map': 'नक्शा',
  'recycler.aggregator': 'कबाड़ी दुकान',
  'recycler.transport': 'भाड़ा',
  'recycler.none': 'आस-पास कोई रिसाइकलर यह माल नहीं लेता.',
  'epr.title': 'रिकॉर्ड वाली बिक्री से अतिरिक्त',
  'epr.bonus': 'EPR बोनस',
  'epr.why': 'मान्यता प्राप्त रिसाइकलर इस माल पर रिसाइक्लिंग सर्टिफिकेट ले सकते हैं — सिर्फ़ इसलिए कि आपका हस्तांतरण दर्ज और हस्ताक्षरित है.',
  'epr.notEligible': 'EPR बोनस नहीं — यह खरीदार मान्यता प्राप्त रिसाइकलर नहीं है.',
  'epr.assumption': 'अनुमान ₹{rate}/किलो सर्टिफिकेट मूल्य पर. यह संकेत है, तय भाव नहीं.',
  'epr.withBonus': 'EPR बोनस सहित',
  'offers.title': 'आपको मिले भाव',
  'offers.accept': 'यह भाव लो',
  'offers.countered': 'भाव बदला',
  'offers.none': 'अभी कोई भाव नहीं. रिसाइकलर जल्दी जवाब देंगे.',
  'econ.more': 'ज़्यादा',
  'econ.compare': 'मान्यता प्राप्त रिसाइकलर {formal} बनाम पास की कबाड़ी दुकान {agg} — भाड़ा निकालकर.',
  'price.observations': '{n} नोंद',
  'price.estimateOnly': 'सिर्फ़ अंदाज़ा',
  'price.source': 'भाव हाल की बिक्री और रिसाइकलर रेट का औसत है.',

  'material.pcb_populated': 'सर्किट बोर्ड (पुर्ज़ों सहित)',
  'material.pcb_bare': 'खाली बोर्ड',
  'material.cables': 'तार / केबल',
  'material.crt': 'पुराना टीवी / मॉनिटर',
  'material.lcd_panel': 'एलसीडी स्क्रीन',
  'material.battery_liion': 'लिथियम बैटरी',
  'material.battery_lead_acid': 'बड़ी बैटरी (लेड)',
  'material.motors_magnets': 'मोटर / चुंबक',
  'material.plastics_mixed': 'प्लास्टिक',
  'material.aluminium': 'एल्युमिनियम',
  'material.ferrous': 'लोहा',
  'material.ewaste_mixed': 'मिला-जुला ई-कचरा',
};

const mr: Dict = {
  'app.name': 'कबाडीवाला कनेक्ट',
  'app.tagline': 'योग्य भाव. सुरक्षित काम. थेट रिसायकलरकडे.',

  'nav.home': 'होम',
  'nav.newLot': 'नवा माल',
  'nav.prices': 'भाव',
  'nav.earnings': 'कमाई',
  'nav.safety': 'सुरक्षा',

  'action.continue': 'पुढे चला',
  'action.back': 'मागे',
  'action.confirm': 'पक्कं करा',
  'action.cancel': 'नको',
  'action.retake': 'पुन्हा फोटो काढा',
  'action.takePhoto': 'फोटो काढा',
  'action.listen': 'ऐका',
  'action.next': 'पुढचा',
  'action.done': 'झालं',
  'action.sell': 'हा माल विका',
  'action.sellAnyway': 'तरीही विका',
  'action.showQr': 'कोड दाखवा',
  'action.scanQr': 'कोड स्कॅन करा',

  'onboard.chooseLanguage': 'तुमची भाषा निवडा',
  'onboard.welcome': 'स्वागत आहे',
  'onboard.enterPhone': 'तुमचा मोबाईल नंबर',
  'onboard.whereYouWork': 'तुम्ही कुठे काम करता?',

  'lot.title': 'नवा माल',
  'lot.whatIsIt': 'तुम्ही काय गोळा केलं?',
  'lot.howMuch': 'किती वजन आहे?',
  'lot.kg': 'किलो',
  'lot.estimate': 'अंदाजे किंमत',
  'lot.estimateRange': 'योग्य भावाची रेंज',
  'lot.aiGuess': 'हे वाटतंय',
  'lot.aiConfidence': 'खात्री',
  'lot.notRight': 'बरोबर नाही? स्वतः निवडा',
  'lot.created': 'माल सेव्ह झाला',
  'lot.savedOffline': 'तुमच्या फोनमध्ये सेव्ह आहे. नेटवर्क आल्यावर पाठवू.',

  'price.title': 'आजचे भाव',
  'price.perKg': 'प्रति किलो',
  'price.trendUp': 'भाव वाढतोय',
  'price.trendDown': 'भाव पडतोय',
  'price.trendFlat': 'भाव स्थिर आहे',
  'price.fairBand': 'योग्य भावाची रेंज',
  'price.yourOffer': 'तुम्हाला मिळालेला भाव',
  'price.tooLow': 'हा भाव कमी आहे. तुम्हाला जास्त मिळायला हवा.',
  'price.fair': 'हा भाव ठीक आहे.',
  'price.good': 'हा भाव चांगला आहे.',

  'recycler.title': 'तुमच्या जवळचे अधिकृत रिसायकलर',
  'recycler.verified': 'अधिकृतता वैध आहे',
  'recycler.expired': 'अधिकृतता संपली आहे',
  'recycler.distance': 'लांब',
  'recycler.pickup': 'मोफत पिकअप',
  'recycler.noPickup': 'तुम्हाला पोहोचवावं लागेल',
  'recycler.offers': 'भाव देतो',

  'handover.title': 'माल देणे',
  'handover.showToRecycler': 'हा कोड रिसायकलरला दाखवा',
  'handover.verified': 'तपासणी झाली',
  'handover.signatureOk': 'सही बरोबर आहे — ही नोंद खरी आहे',
  'handover.signatureBad': 'सही जुळत नाही. घेऊ नका.',
  'handover.worksOffline': 'हे नेटवर्कशिवाय पण चालतं',

  'trust.title': 'तुमची अचूकता',
  'trust.good': 'तुमचं वजन काट्याशी जुळतं. रिसायकलर तुमच्यावर विश्वास ठेवतात.',
  'trust.ok': 'तुमचं वजन बहुतेक वेळा बरोबर असतं. काळजीपूर्वक तोला, भाव चांगला मिळेल.',
  'trust.poor': 'तुमचं वजन अनेकदा काट्यापेक्षा वेगळं असतं. तुमचा काटा तपासा.',
  'trust.help': 'अचूक वजनामुळे तुम्हाला आधी संधी आणि चांगला भाव मिळतो.',
  'earnings.title': 'माझी कमाई',
  'earnings.paid': 'मिळाले',
  'earnings.pending': 'यायचे आहेत',
  'earnings.total': 'एकूण',
  'earnings.thisWeek': 'या आठवड्यात',
  'earnings.thisMonth': 'या महिन्यात',
  'earnings.passport': 'माझ्या कमाईची नोंद डाउनलोड करा',

  'sync.pending': 'पाठवायचे आहेत',
  'sync.syncing': 'पाठवतोय…',
  'sync.done': 'सर्व पाठवलं',
  'sync.offline': 'नेटवर्क नाही — तुमचं काम सेव्ह आहे',

  'safety.title': 'सुरक्षित काम करा',
  'safety.generic': 'हातमोजे घाला. मुलांना मालापासून दूर ठेवा.',
  'safety.cables_no_burn':
    'तार जाळू नका. धूर विषारी आहे. सोलून विका — जास्त भाव मिळेल.',
  'safety.pcb': 'बोर्डवर असिड वापरू नका. हात जळतात आणि सोनं वाया जातं.',
  'safety.pcb_bare': 'बोर्ड जाळू नका. पूर्ण विका.',
  'safety.crt': 'जुना टीव्ही फोडू नका. काच फुटू शकते आणि शिसं विषारी आहे.',
  'safety.lcd': 'स्क्रीन फोडू नका. आतल्या नळ्या काळजीपूर्वक काढा.',
  'safety.liion':
    'या बॅटरीला छिद्र पाडू नका, गरम करू नका. आगीपासून दूर ठेवा. स्फोट होऊ शकतो.',
  'safety.lead_acid': 'आत असिड आहे. उलटी करू नका. हातमोजे घाला, द्रवाला हात लावू नका.',
  'safety.motors': 'शक्तिशाली चुंबक. बोटांपासून आणि फोनपासून दूर ठेवा.',
  'safety.plastics': 'प्लास्टिक जाळू नका. धूर फुफ्फुसं खराब करतो.',
  'safety.mixed': 'काळजीपूर्वक वेगळं करा. हातमोजे घाला.',

  'why.pcb': 'जाळल्याने आतलं सोनं आणि टँटॅलम नष्ट होतं. पूर्ण विका, जास्त पैसे मिळतील.',
  'why.pcb_bare': 'पूर्ण बोर्ड जळक्या तांब्यापेक्षा जास्त किमतीचा आहे.',
  'why.cables': 'सोललेलं तांबं जळक्या तांब्यापेक्षा खूप जास्त भावाने जातं.',
  'why.crt': 'अधिकृत रिसायकलर CRT सुरक्षितपणे घेतात आणि शिशाचा भाव देतात.',
  'why.lcd': 'स्क्रीनमध्ये इंडियम असतं, जे मौल्यवान आणि दुर्मिळ आहे.',
  'why.liion': 'आतलं लिथियम आणि कोबाल्ट मौल्यवान आहे. अधिकृत रिसायकलर त्याचा भाव देतात.',
  'why.lead_acid': 'शिसं पूर्ण रिसायकल होतं आणि त्याचा चांगला भाव मिळतो.',
  'why.motors': 'चुंबकात निओडिमियम असतं, जो दुर्मिळ आणि मौल्यवान धातू आहे.',
  'why.plastics': 'स्वच्छ वेगळं केलेलं प्लास्टिक मिश्रापेक्षा जास्त भावाने जातं.',
  'why.aluminium': 'स्वच्छ अल्युमिनियमचा भाव नेहमी चांगला असतो.',
  'why.ferrous': 'वजनावर विका; प्लास्टिक वेगळं करा.',
  'why.mixed': 'विकण्याआधी वेगळं केलं तर भाव वाढतो.',

  'recycler.bestRate': 'सर्वोत्तम भाव',
  'recycler.outOfArea': 'सेवा क्षेत्राबाहेर',
  'view.list': 'यादी',
  'view.map': 'नकाशा',
  'recycler.aggregator': 'भंगार दुकान',
  'recycler.transport': 'वाहतूक',
  'recycler.none': 'जवळपास कोणी हा माल घेत नाही.',
  'epr.title': 'नोंद असलेल्या विक्रीतून जास्तीचे',
  'epr.bonus': 'EPR बोनस',
  'epr.why': 'अधिकृत रिसायकलर या मालावर रिसायकलिंग प्रमाणपत्र घेऊ शकतात — फक्त कारण तुमची देवाणघेवाण नोंदलेली आणि सही केलेली आहे.',
  'epr.notEligible': 'EPR बोनस नाही — हा खरेदीदार अधिकृत रिसायकलर नाही.',
  'epr.assumption': 'अंदाज ₹{rate}/किलो प्रमाणपत्र मूल्यावर. हा अंदाज आहे, ठरलेला भाव नाही.',
  'epr.withBonus': 'EPR बोनससह',
  'offers.title': 'तुम्हाला मिळालेले भाव',
  'offers.accept': 'हा भाव घ्या',
  'offers.countered': 'भाव बदलला',
  'offers.none': 'अजून कोणी भाव दिला नाही. रिसायकलर लवकरच उत्तर देतील.',
  'econ.more': 'जास्त',
  'econ.compare': 'अधिकृत रिसायकलर {formal} विरुद्ध जवळची भंगार दुकान {agg} — वाहतूक वजा करून.',
  'price.observations': '{n} नोंदी',
  'price.estimateOnly': 'फक्त अंदाज',
  'price.source': 'भाव अलीकडच्या विक्री आणि रिसायकलर दरांची सरासरी आहे.',

  'material.pcb_populated': 'सर्किट बोर्ड (भाग असलेले)',
  'material.pcb_bare': 'रिकामा बोर्ड',
  'material.cables': 'तार / केबल',
  'material.crt': 'जुना टीव्ही / मॉनिटर',
  'material.lcd_panel': 'एलसीडी स्क्रीन',
  'material.battery_liion': 'लिथियम बॅटरी',
  'material.battery_lead_acid': 'मोठी बॅटरी (लेड)',
  'material.motors_magnets': 'मोटर / चुंबक',
  'material.plastics_mixed': 'प्लास्टिक',
  'material.aluminium': 'अल्युमिनियम',
  'material.ferrous': 'लोखंड',
  'material.ewaste_mixed': 'मिश्र ई-कचरा',
};

const DICTS: Record<Locale, Dict> = { mr, hi, en };

/**
 * Resolve a key. Falls back mr -> hi -> en -> the key itself, so a missing
 * Marathi string degrades to Hindi (far closer than English for this user)
 * rather than to a blank or a raw key.
 */
export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const chain: Locale[] = locale === 'mr' ? ['mr', 'hi', 'en'] : locale === 'hi' ? ['hi', 'en'] : ['en'];
  let out = key;
  for (const l of chain) {
    const hit = DICTS[l][key];
    if (hit) {
      out = hit;
      break;
    }
  }
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return out;
}

/** Keys with no Marathi entry — surfaced by a dev-only check, not shipped to users. */
export function missingTranslations(locale: Locale): string[] {
  return Object.keys(en).filter((k) => !DICTS[locale][k]);
}
