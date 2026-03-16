export interface Subject {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  units: Unit[];
}

export interface Unit {
  id: string;
  title: string;
  titleAr: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  titleAr: string;
  content: string;
  vocabulary?: { word: string; meaning: string }[];
  dates?: { date: string; event: string }[];
  laws?: { name: string; formula: string }[];
  grammar?: string;
  methodologies?: string[];
}

export const CURRICULUM: Subject[] = [
  {
    id: "arabic",
    name: "Arabic Language",
    nameAr: "اللغة العربية وآدابها",
    icon: "BookOpen",
    color: "emerald",
    units: [
      {
        id: "ar_u1",
        title: "Educational Literature",
        titleAr: "الأدب التعليمي (عصر الانحطاط)",
        lessons: [
          { id: "ar_l1", title: "Asceticism", titleAr: "ظاهرة الزهد (نص ابن نباتة)", content: "دراسة ظاهرة الزهد في عصر الانحطاط من خلال نص ابن نباتة، مع التركيز على الخصائص الفنية والموضوعية." },
          { id: "ar_l2", title: "Prophetic Praises", titleAr: "المديح النبوي (نص البوصيري)", content: "تحليل قصيدة البردة للبوصيري وخصائص المديح النبوي في هذا العصر." },
          { id: "ar_l3", title: "Estimated Parsing", titleAr: "الإعراب التقديري", content: "قواعد الإعراب التقديري في الأسماء والأفعال المعتلة الآخر." },
          { id: "ar_l4", title: "Subject and Predicate", titleAr: "أحكام المسند والمسند إليه", content: "دراسة أحكام المسند والمسند إليه في الجملة العربية." }
        ]
      },
      {
        id: "ar_u2",
        title: "Literary Scientific Prose",
        titleAr: "الوحدة: النثر العلمي المتأدب",
        lessons: [
          { id: "ar_l5", title: "Science and Mind", titleAr: "العلم والعقل (نص ابن خلدون)", content: "تحليل نص ابن خلدون حول العلاقة بين العلم والعقل وخصائص أسلوبه." },
          { id: "ar_l6", title: "Scientific Prose Characteristics", titleAr: "خصائص النثر العلمي", content: "دراسة الخصائص العامة للنثر العلمي المتأدب في العصر المملوكي والعثماني." },
          { id: "ar_l7", title: "Sentences with Position", titleAr: "إعراب الجمل التي لها محل من الإعراب", content: "قواعد إعراب الجمل التي تقع موقع المفرد ولها محل إعرابي." }
        ]
      },
      {
        id: "ar_u3",
        title: "Humanism in Mahjar Poetry",
        titleAr: "نزعة الإنسانية في شعر الرابطة القلمية",
        lessons: [
          { id: "ar_l8", title: "Human Values", titleAr: "قيم إنسانية (نص إيليا أبو ماضي)", content: "دراسة النزعة الإنسانية والتفاؤلية في شعر إيليا أبو ماضي." },
          { id: "ar_l9", title: "Mahjar Literature", titleAr: "أدب المهجر", content: "خصائص مدرسة المهجر (الرابطة القلمية والعصبة الأندلسية) وتجديدها في الشعر العربي." },
          { id: "ar_l10", title: "Sentences without Position", titleAr: "الجمل التي لا محل لها من الإعراب", content: "دراسة الجمل التي لا تقع موقع المفرد وليس لها محل إعرابي." }
        ]
      },
      {
        id: "ar_u4",
        title: "Commitment in Modern Poetry",
        titleAr: "الالتزام في الشعر العربي الحديث",
        lessons: [
          { id: "ar_l11", title: "Palestine Issue", titleAr: "القضية الفلسطينية (نزار قباني/محمود درويش)", content: "تطور القضية الفلسطينية في الشعر العربي الحديث والمعاصر." },
          { id: "ar_l12", title: "Algerian Revolution", titleAr: "الثورة التحريرية الجزائرية (مفدي زكريا)", content: "صدى الثورة الجزائرية في الشعر العربي ودور مفدي زكريا." },
          { id: "ar_l13", title: "Particles Meanings", titleAr: "معاني وإعراب (إذ، إذا، إذن، حينئذ)", content: "دراسة المعاني المختلفة لهذه الأدوات وقواعد إعرابها." }
        ]
      },
      {
        id: "ar_u5",
        title: "The Art of Essay",
        titleAr: "فن المقال",
        lessons: [
          { id: "ar_l14", title: "Social/Political Essay", titleAr: "المقال الاجتماعي والسياسي (البشير الإبراهيمي)", content: "خصائص المقال عند البشير الإبراهيمي ومدرسة الصنعة اللفظية." },
          { id: "ar_l15", title: "Verbal Craftsmanship School", titleAr: "مدرسة الصنعة اللفظية", content: "دراسة خصائص مدرسة الصنعة اللفظية في النثر الحديث." },
          { id: "ar_l16", title: "Conditional Particles", titleAr: "أحكام لو، لولا، لوما", content: "دراسة معاني وأحكام حروف الامتناع والشرط." }
        ]
      }
    ]
  },
  {
    id: "islamic",
    name: "Islamic Sciences",
    nameAr: "العلوم الإسلامية",
    icon: "Moon",
    color: "green",
    units: [
      {
        id: "is_u1",
        title: "Islamic Creed",
        titleAr: "العقيدة الإسلامية",
        lessons: [
          { id: "is_l1", title: "Creed Stability", titleAr: "وسائل القرآن في تثبيت العقيدة الإسلامية", content: "دراسة الطرق التي استعملها القرآن الكريم لترسيخ العقيدة في النفوس." },
          { id: "is_l2", title: "Quran and Mind", titleAr: "موقف القرآن من العقل", content: "تكريم الإسلام للعقل ودوره في فهم الشريعة والكون." }
        ]
      },
      {
        id: "is_u2",
        title: "Islamic Legislation",
        titleAr: "التشريع الإسلامي",
        lessons: [
          { id: "is_l3", title: "Sharia Objectives", titleAr: "مقاصد الشريعة الإسلامية", content: "دراسة الضروريات والحاجيات والتحسينيات في الإسلام." },
          { id: "is_l4", title: "Fighting Crime", titleAr: "منهج الإسلام في محاربة الانحراف والجريمة", content: "دراسة الحدود والقصاص والتعزير وأثرها في أمن المجتمع." },
          { id: "is_l5", title: "Equality", titleAr: "المساواة أمام أحكام الشريعة الإسلامية", content: "مبدأ العدل والمساواة في الإسلام وأثره الاجتماعي." },
          { id: "is_l6", title: "Legislation Sources", titleAr: "مصادر التشريع (الإجماع، القياس، المصلحة المرسلة)", content: "دراسة المصادر التبعية للتشريع الإسلامي وكيفية استنباط الأحكام." }
        ]
      },
      {
        id: "is_u3",
        title: "Financial Transactions",
        titleAr: "المعاملات المالية",
        lessons: [
          { id: "is_l7", title: "Riba", titleAr: "الربا وأحكامه", content: "تعريف الربا، أنواعه (الفضل والنسيئة) وعلة التحريم." },
          { id: "is_l8", title: "Permitted Transactions", titleAr: "من المعاملات المالية الجائزة (بيع التقسيط، المرابحة، الصرف)", content: "دراسة صور المعاملات المالية الحديثة وضوابطها الشرعية." }
        ]
      },
      {
        id: "is_u4",
        title: "Family and Society",
        titleAr: "الأسرة والاجتماع",
        lessons: [
          { id: "is_l9", title: "Parents and Children", titleAr: "هدي النبي ﷺ في صلة الآباء بالأبناء", content: "حقوق الأبناء والآباء في الإسلام من خلال السنة النبوية." },
          { id: "is_l10", title: "Farewell Pilgrimage", titleAr: "تحليل خطبة الرسول ﷺ في حجة الوداع", content: "استخلاص القيم الإنسانية والاجتماعية من خطبة الوداع." }
        ]
      }
    ]
  },
  {
    id: "history_geo",
    name: "History and Geography",
    nameAr: "التاريخ والجغرافيا",
    icon: "Globe",
    color: "amber",
    units: [
      {
        id: "hg_u1",
        title: "Bipolarity",
        titleAr: "تطور العالم في ظل الثنائية القطبية (1945-1989)",
        lessons: [
          { id: "hg_l1", title: "Conflict Emergence", titleAr: "بروز الصراع وتشكل العالم", content: "معايير تشكل العالم بعد الحرب العالمية الثانية وأسباب الحرب الباردة." },
          { id: "hg_l2", title: "International Crises", titleAr: "الأزمات الدولية في ظل الصراع", content: "دراسة أزمات برلين، كوريا، السويس، وكوبا." },
          { id: "hg_l3", title: "Unipolarity", titleAr: "من الثنائية إلى الأحادية القطبية", content: "تفكك الكتلة الشرقية وظهور النظام الدولي الجديد." }
        ]
      },
      {
        id: "hg_u2",
        title: "Algeria 1945-1989",
        titleAr: "الجزائر ما بين 1945-1989",
        lessons: [
          { id: "hg_l4", title: "Resistance to Revolution", titleAr: "من المقاومة إلى الثورة التحريرية", content: "تبلور الوعي الوطني الجزائري بعد مجازر 8 ماي 1945." },
          { id: "hg_l5", title: "Armed Struggle", titleAr: "العمل المسلح ورد فعل الاستعمار", content: "استراتيجية الثورة الجزائرية داخلياً وخارجياً وردود الفعل الفرنسية." },
          { id: "hg_l6", title: "Independence", titleAr: "استعادة السيادة الوطنية وبناء الدولة الجزائرية", content: "مفاوضات إيفيان، الاستقلال، وتحديات بناء الدولة." }
        ]
      },
      {
        id: "hg_u3",
        title: "World Economy",
        titleAr: "واقع الاقتصاد العالمي",
        lessons: [
          { id: "hg_l7", title: "Development/Underdevelopment", titleAr: "إشكالية التقدم والتخلف", content: "معايير التصنيف الاقتصادي والاجتماعي في العالم." },
          { id: "hg_l8", title: "Global Exchanges", titleAr: "المبادلات والتدفقات في العالم (البترول، الغذاء، الأموال)", content: "دراسة حركة السلع ورؤوس الأموال في السوق العالمية." }
        ]
      },
      {
        id: "hg_u4",
        title: "Economic Powers",
        titleAr: "القوى الاقتصادية الكبرى في العالم",
        lessons: [
          { id: "hg_l9", title: "USA Power", titleAr: "مصادر القوة الاقتصادية للولايات المتحدة الأمريكية", content: "عوامل القوة الاقتصادية الأمريكية وتأثيرها العالمي." },
          { id: "hg_l10", title: "European Union", titleAr: "ظاهرة التكتل في الاتحاد الأوروبي", content: "مراحل بناء الاتحاد الأوروبي ودوره كقوة اقتصادية." },
          { id: "hg_l11", title: "East Asia", titleAr: "العلاقة بين السكان والتنمية في شرق وجنوب شرق آسيا", content: "تجربة التنمية في دول شرق وجنوب شرق آسيا." }
        ]
      }
    ]
  },
  {
    id: "philosophy",
    name: "Philosophy",
    nameAr: "الفلسفة",
    icon: "Brain",
    color: "purple",
    units: [
      {
        id: "ph_u1",
        title: "Question between Problem and Problematic",
        titleAr: "الإشكالية الأولى: السؤال بين المشكلة والإشكالية",
        lessons: [
          { 
            id: "ph_l1", 
            title: "Philosophical Problem and Scientific Problem", 
            titleAr: "المشكلة الأولى: الإشكالية الفلسفية والمشكلة العلمية", 
            content: "علاقة الفلسفة بالعلم (ما الفرق بين الفلسفة والعلم؟)، قيمة الفلسفة (هل للفلسفة قيمة في زمن العلم؟).",
            methodologies: ["مقارنة", "الجدل", "تحليل نص"]
          }
        ]
      },
      {
        id: "ph_u2",
        title: "In Relationships between People",
        titleAr: "الإشكالية الثانية: في العلاقات بين الناس",
        lessons: [
          { id: "ph_l2", title: "Language and Thought", titleAr: "المشكلة الأولى: في اللغة والفكر", content: "علاقة الدال بالمدلول (هل العلاقة بين الدال والمدلول ضرورية أم اصطلاحية؟)، علاقة اللغة بالفكر (هل العلاقة بين اللغة والفكر انفصالية أم اتصالية؟)، وظائف اللغة (هل تنحصر وظيفة اللغة في التواصل فحسب؟).", methodologies: ["الجدل", "الاستقصاء بالوضع", "مقارنة", "تحليل نص"] },
          { id: "ph_l3", title: "Consciousness of Self and Other", titleAr: "المشكلة الثانية: في الشعور بالأنا والشعور بالغير", content: "أساس معرفة الذات (هل معرفة الذات تتأسس على الوعي بها فقط؟)، علاقة الأنا بالغير (هل علاقة الأنا بالآخر قائمة على التواصل أم الصراع؟).", methodologies: ["الجدل", "الاستقصاء بالوضع", "تحليل نص"] },
          { id: "ph_l4", title: "Freedom and Responsibility", titleAr: "المشكلة الثالثة: في الحرية والمسؤولية", content: "علاقة الحرية بالمسؤولية (هل الحرية شرط أساسي لقيام المسؤولية؟).", methodologies: ["الجدل", "الاستقصاء بالوضع", "تحليل نص"] },
          { id: "ph_l5", title: "Violence and Tolerance", titleAr: "المشكلة الرابعة: العنف والتسامح", content: "علاقة العنف بالتسامح (هل يجب مقابلة العنف بالعنف أم بالتسامح؟).", methodologies: ["الجدل", "الاستقصاء بالوضع", "تحليل نص"] },
          { id: "ph_l6", title: "Cultural Diversity and Globalization", titleAr: "المشكلة الخامسة: التنوع الثقافي والعولمة", content: "قيمة العولمة (هل العولمة حتمية تاريخية أم إيديولوجيا؟).", methodologies: ["الجدل", "الاستقصاء بالوضع", "تحليل نص"] }
        ]
      },
      {
        id: "ph_u3",
        title: "Philosophy of Sciences",
        titleAr: "الإشكالية الثالثة: في فلسفة العلوم",
        lessons: [
          { id: "ph_l7", title: "Philosophy of Mathematics", titleAr: "المشكلة الأولى: في فلسفة الرياضيات", content: "أصل المفاهيم الرياضية (هل المفاهيم الرياضية ذات نشأة حسية أم عقلية؟)، اليقين الرياضي (هل اليقين الرياضي مطلق؟).", methodologies: ["الجدل", "الاستقصاء بالوضع", "تحليل نص"] },
          { id: "ph_l8", title: "Sciences of Matter and Life", titleAr: "المشكلة الثالثة: في علوم المادة الجامدة وعلوم المادة الحية", content: "قيمة الفرضية (هل الفرضية خطوة ضرورية في التجريب العلمي؟)، الحتمية واللاحتمية (هل تخضع الظواهر الطبيعية لحتمية صارمة؟)، تبرير الاستقراء (هل يمكن تبرير الاستقراء؟)، قيمة التجربة (هل التجربة هي المقياس الأساسي الذي يجعل العلم علما؟)، التجريب في البيولوجيا (هل يمكن دراسة الظواهر البيولوجية دراسة علمية؟).", methodologies: ["الجدل", "الاستقصاء بالوضع", "تحليل نص"] }
        ]
      },
      {
        id: "ph_u4",
        title: "Consistency of Thought with Itself",
        titleAr: "الإشكالية الرابعة: انطباق الفكر مع نفسه",
        lessons: [
          { id: "ph_l9", title: "Consistency of Thought with Itself", titleAr: "المشكلة الأولى: في انطباق الفكر مع نفسه", content: "هل انطباق الفكر مع ذاته يضمن سلامة الفكر من الخطأ والتناقض؟", methodologies: ["الجدل", "الاستقصاء بالوضع", "تحليل نص"] }
        ]
      }
    ]
  },
  {
    id: "math",
    name: "Mathematics",
    nameAr: "الرياضيات",
    icon: "Calculator",
    color: "indigo",
    units: [
      {
        id: "ma_u1",
        title: "Numerical Sequences",
        titleAr: "المتتاليات العددية",
        lessons: [
          { id: "ma_l1", title: "Arithmetic Sequences", titleAr: "المتتاليات الحسابية", content: "قوانين المتتالية الحسابية، الحد العام، والمجموع." },
          { id: "ma_l2", title: "Geometric Sequences", titleAr: "المتتاليات الهندسية", content: "قوانين المتتالية الهندسية، الحد العام، والمجموع." },
          { id: "ma_l3", title: "Sequence Sum", titleAr: "مجموع حدود متتالية", content: "طرق حساب مجموع حدود متعاقبة من متتالية عددية." }
        ]
      },
      {
        id: "ma_u2",
        title: "Numerical Functions",
        titleAr: "الدوال العددية",
        lessons: [
          { id: "ma_l4", title: "Limits and Continuity", titleAr: "النهايات والاستمرارية", content: "حساب النهايات عند أطراف مجال التعريف ودراسة الاستمرارية." },
          { id: "ma_l5", title: "Polynomial Functions", titleAr: "دراسة الدوال كثيرات الحدود", content: "دراسة التغيرات، المشتقة، وجدول التغيرات للدوال كثيرات الحدود." },
          { id: "ma_l6", title: "Rational Functions", titleAr: "الدوال التناظرية (الكسرية)", content: "دراسة الدوال من الشكل (ax+b)/(cx+d)." }
        ]
      },
      {
        id: "ma_u3",
        title: "Statistics and Probability",
        titleAr: "الإحصاء والاحتمالات",
        lessons: [
          { id: "ma_l7", title: "Counting and Probability", titleAr: "العد والاحتمالات", content: "مبادئ العد الأساسية وحساب احتمالات الحوادث البسيطة." },
          { id: "ma_l8", title: "Conditional Probability", titleAr: "الاحتمالات الشرطية والاستقلالية", content: "دراسة الاحتمالات الشرطية واستقلال الحوادث." }
        ]
      }
    ]
  },
  {
    id: "english",
    name: "English",
    nameAr: "اللغة الإنجليزية",
    icon: "Languages",
    color: "blue",
    units: [
      {
        id: "en_u1",
        title: "Ancient Civilizations",
        titleAr: "Ancient Civilizations",
        lessons: [
          { id: "en_l1", title: "Rise and Fall", titleAr: "Rise and fall of ancient civilizations", content: "Study the factors that led to the emergence and collapse of great civilizations." },
          { id: "en_l2", title: "Heritage", titleAr: "Heritage and achievements of the past", content: "Explore the cultural and scientific contributions of ancient peoples." }
        ]
      },
      {
        id: "en_u2",
        title: "Ethics in Business",
        titleAr: "Ethics in Business",
        lessons: [
          { id: "en_l3", title: "Fighting Corruption", titleAr: "Fighting corruption and fraud", content: "Vocabulary and themes related to anti-corruption and business ethics." },
          { id: "en_l4", title: "Social Responsibility", titleAr: "Social responsibility in companies", content: "The role of businesses in supporting society and the environment." }
        ]
      },
      {
        id: "en_u3",
        title: "Education",
        titleAr: "Education",
        lessons: [
          { id: "en_l5", title: "Educational Systems", titleAr: "Educational systems worldwide", content: "Comparing school systems and teaching methods across different countries." },
          { id: "en_l6", title: "School Life", titleAr: "School life and exams", content: "Vocabulary related to student life, exams, and academic success." }
        ]
      },
      {
        id: "en_u4",
        title: "Feelings and Emotions",
        titleAr: "Feelings and Emotions",
        lessons: [
          { id: "en_l7", title: "Expressing Emotions", titleAr: "Expressing emotions", content: "How to describe feelings and emotional states in English." },
          { id: "en_l8", title: "Social Relations", titleAr: "Friendship and social relations", content: "Vocabulary and idioms related to social interaction and friendship." }
        ]
      }
    ]
  },
  {
    id: "french",
    name: "French",
    nameAr: "اللغة الفرنسية",
    icon: "Book",
    color: "rose",
    units: [
      {
        id: "fr_u1",
        title: "Historical Discourse",
        titleAr: "Le discours d’histoire",
        lessons: [
          { id: "fr_l1", title: "Historical Info", titleAr: "L'information historique", content: "Analyser et produire des textes informant sur des faits historiques." },
          { id: "fr_l2", title: "Testimony", titleAr: "Le témoignage (l'écriture de l'histoire)", content: "Le rôle du témoin dans la narration des événements historiques." }
        ]
      },
      {
        id: "fr_u2",
        title: "Debate of Ideas",
        titleAr: "Le débat d’idées",
        lessons: [
          { id: "fr_l3", title: "Argumentation", titleAr: "Argumentation et confrontation des points de vue", content: "Savoir présenter des arguments et répondre à des contre-arguments." },
          { id: "fr_l4", title: "Persuasion", titleAr: "Convaincre et persuader", content: "Les techniques rhétoriques pour influencer l'opinion d'autrui." }
        ]
      },
      {
        id: "fr_u3",
        title: "The Appeal",
        titleAr: "L’appel",
        lessons: [
          { id: "fr_l5", title: "Action Incitement", titleAr: "L'incitation à l'action", content: "Étude du discours exhortatif visant à mobiliser les gens." },
          { id: "fr_l6", title: "Exhortative Discourse", titleAr: "Les types de discours exhortatifs", content: "Structure et caractéristiques de l'appel." }
        ]
      }
    ]
  },
  {
    id: "spanish",
    name: "Spanish",
    nameAr: "اللغة الإسبانية",
    icon: "Globe",
    color: "orange",
    units: [
      {
        id: "sp_u1",
        title: "Personal Sphere",
        titleAr: "Ámbito Personal (الجانب الشخصي)",
        lessons: [
          { id: "sp_l1", title: "Youth and Family", titleAr: "Los jóvenes y la familia", content: "Vocabulario y temas sobre la vida familiar y juvenil." },
          { id: "sp_l2", title: "Dreams", titleAr: "Sueños y deseos de futuro", content: "Expresar planes y aspiraciones para el futuro." }
        ]
      },
      {
        id: "sp_u2",
        title: "Scientific Sphere",
        titleAr: "Ámbito Científico (الجانب العلمي)",
        lessons: [
          { id: "sp_l3", title: "Inventions", titleAr: "Los inventos y la tecnología", content: "El impacto de los descubrimientos científicos en la sociedad." },
          { id: "sp_l4", title: "Tech Pros/Cons", titleAr: "El pro y el contra de la tecnología", content: "Debatir sobre las ventajas y desventajas de la tecnología moderna." }
        ]
      },
      {
        id: "sp_u3",
        title: "Work Sphere",
        titleAr: "Ámbito Laboral (جانب العمل)",
        lessons: [
          { id: "sp_l5", title: "World of Work", titleAr: "El mundo del trabajo", content: "Vocabulario sobre profesiones y el mercado laboral." },
          { id: "sp_l6", title: "Women and Work", titleAr: "Mujer y trabajo / Trabajo infantil", content: "Temas sociales relacionados con el empleo." }
        ]
      }
    ]
  }
];
