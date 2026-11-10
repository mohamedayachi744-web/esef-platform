// ملف الإعداد: عدّل هنا الأسماء والشعب والمواد فقط.
const SITE={
 brand:'دروسي',
 contact:'', // بريد تواصل عام للزوار (يُفضَّل أن يكون غير بريد دخول المشرفين)
 school:'المدرسة العليا للتربية والتكوين – القنيطرة',
 headline:'كل ما تحتاجه لمراجعتك في مكان واحد',
 sub:'دروس وامتحانات سابقة ومراجع مرتبة حسب الفصل والمادة، يشاركها الطلبة القدامى مع الجدد.'
};
const TYPES=['الكل','درس','امتحان سابق','مرجع','ملخص'];
const SPECIALTIES=[
 {id:'islamic',name:'الدراسات الإسلامية',
  // قاعدة ذهبية: لا تغيّر قيمة id أبداً بعد إضافة مصادر. يمكنك تغيير name بحرية.
  // عند إضافة مادة جديدة اختر id جديداً لم يُستعمل من قبل.
  semesters:[
  {id:'s1',name:'الفصل الأول',modules:[
   {id:'s1-aqida',name:'العقيدة الإسلامية'},
   {id:'s1-tazkiya',name:'التزكية والتصوف السني'},
   {id:'s1-quran-sciences',name:'علوم القرآن'},
   {id:'s1-tashri-history',name:'تاريخ التشريع الإسلامي'},
   {id:'s1-nahw',name:'النحو العربي'},
   {id:'s1-hadith-intro',name:'مدخل إلى علوم الحديث'}
  ]},
  {id:'s2',name:'الفصل الثاني',modules:[
   {id:'s2-tarbiya-thought',name:'الفكر التربوي الإسلامي'},
   {id:'s2-sarf',name:'الصرف والإملاء'},
   {id:'s2-hadith-sciences',name:'علوم الحديث'},
   {id:'s2-qiraat',name:'القراءات وقواعد التجويد'},
   {id:'s2-sira',name:'السيرة النبوية وأبعادها القيمية'},
   {id:'s2-usul-1',name:'أصول الفقه: الأدلة - الأحكام'}
  ]},
  {id:'s3',name:'الفصل الثالث',modules:[
   {id:'s3-kalam',name:'علم الكلام والتحديات المعاصرة'},
   {id:'s3-edu-sciences',name:'علوم التربية'},
   {id:'s3-tafsir',name:'علم التفسير ومناهج المفسرين'},
   {id:'s3-usul-2',name:'أصول الفقه: الدلالات - الاجتهاد'},
   {id:'s3-balagha',name:'البلاغة النبوية'},
   {id:'s3-fiqh-ibadat-1',name:'فقه العبادات: الطهارة - الصلاة'}
  ]},
  {id:'s4',name:'الفصل الرابع',modules:[
   {id:'s4-didactic-approaches',name:'المقاربات والطرق الديداكتيكية'},
   {id:'s4-hadith-fiqh',name:'فقه الحديث'},
   {id:'s4-khilafa',name:'الخلافة الراشدة والقيم الإنسانية'},
   {id:'s4-adab',name:'الأدب الإسلامي'},
   {id:'s4-fiqh-ibadat-2',name:'فقه العبادات: الزكاة - الصوم - الحج'},
   {id:'s4-civilization',name:'الفكر والحضارة الإسلامية'}
  ]},
  {id:'s5',name:'الفصل الخامس',modules:[
   {id:'s5-didactic-islamic',name:'ديداكتيك التربية الإسلامية'},
   {id:'s5-fiqh-muamalat',name:'فقه المعاملات المالية'},
   {id:'s5-maqasid',name:'مقاصد الشريعة الإسلامية'},
   {id:'s5-ethics-law',name:'أخلاقيات المهنة والتشريع المدرسي'},
   {id:'s5-research-method',name:'منهجية البحث في العلوم الإنسانية'}
  ]},
  {id:'s6',name:'الفصل السادس',modules:[
   {id:'s6-ideas-history',name:'تاريخ الأفكار'},
   {id:'s6-epistemology',name:'المنهجية المعرفية الإسلامية'},
   {id:'s6-docimology',name:'الدوسيمولوجيا والتقويم'},
   {id:'s6-family-fiqh',name:'فقه الأسرة والتحديات المعاصرة'},
   {id:'s6-comparative-fiqh',name:'الفقه المقارن'}
  ]}
  ]}
];

// اتصال Supabase: المفتاح العام آمن للنشر. لا تضع هنا أبداً مفتاح secret أو service_role.
const SUPABASE={url:'https://ytwmluzimvezcpnhzeqb.supabase.co',key:'sb_publishable_e5gCBqKB_ONWZ1ZLR47APQ_lXVSNOBs'};

// المواقع المعتمدة للروابط. أي رابط من غيرها يطلب تأكيداً إضافياً من المشرف قبل الحفظ.
const ALLOWED_HOSTS=['drive.google.com','docs.google.com','shamela.ws','dorar.net','tanzil.net'];
