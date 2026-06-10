export type Language = 'fr' | 'en' | 'ar' | 'pt' | 'zh';

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'fr', label: '🇫🇷 FR' },
  { code: 'en', label: '🇬🇧 EN' },
  { code: 'ar', label: '🇦🇪 AR' },
  { code: 'pt', label: '🇵🇹 PT' },
  { code: 'zh', label: '🇨🇳 ZH' },
];

// Languages written right-to-left.
export const RTL_LANGUAGES: Language[] = ['ar'];

export type TranslationKey =
  // Establishment home
  | 'header.subtitle'
  | 'carousel.specials'
  | 'carousel.new'
  | 'carousel.deals'
  | 'category.all'
  | 'category.burgers'
  | 'category.pizzas'
  | 'category.drinks'
  | 'category.desserts'
  | 'menu.title'
  | 'menu.demoNotice'
  | 'menu.loading'
  | 'menu.confirmDeleteCategory'
  | 'menu.newCategory'
  | 'menu.addCategory'
  | 'menu.empty'
  | 'menu.delete'
  | 'menu.productName'
  | 'menu.productPrice'
  | 'menu.productDescription'
  | 'menu.available'
  | 'menu.unavailable'
  | 'menu.edit'
  | 'menu.addProduct'
  | 'menu.save'
  | 'product.add'
  | 'qr.title'
  | 'qr.description'
  | 'qr.generating'
  | 'qr.download'
  | 'qr.copy'
  | 'qr.copied'
  // Cart
  | 'cart.title'
  | 'cart.empty'
  | 'cart.total'
  | 'cart.checkout'
  | 'cart.tableNumber'
  | 'cart.placing'
  // Order
  | 'order.successTitle'
  | 'order.successDesc'
  | 'order.error'
  | 'order.done'
  // App fallback
  | 'home.scanPrompt'
  // Onboarding
  | 'onboarding.title'
  | 'onboarding.subtitle'
  | 'onboarding.namePlaceholder'
  | 'onboarding.error'
  | 'onboarding.import'
  | 'onboarding.importHint'
  | 'onboarding.analyzing'
  | 'onboarding.analyzingHint'
  | 'onboarding.doneTitle'
  | 'onboarding.doneDesc'
  | 'onboarding.viewEstablishment'
  | 'onboarding.generate'
  // Manager dashboard
  | 'manager.title'
  | 'manager.greeting'
  | 'manager.actionDone'
  | 'manager.pendingOrders'
  | 'manager.viewAll'
  | 'manager.thinking'
  | 'manager.error'
  | 'manager.inputPlaceholder'
  | 'nav.assistant'
  | 'nav.orders'
  | 'nav.menu'
  | 'nav.settings'
  // Orders management
  | 'orders.empty'
  | 'orders.accept'
  | 'orders.complete'
  | 'orders.cancel'
  | 'orders.table'
  | 'order.status.pending'
  | 'order.status.accepted'
  | 'order.status.completed'
  | 'order.status.cancelled'
  // Auth
  | 'auth.title'
  | 'auth.subtitle'
  | 'auth.email'
  | 'auth.password'
  | 'auth.signIn'
  | 'auth.signUp'
  | 'auth.loading'
  | 'auth.toSignUp'
  | 'auth.toSignIn'
  | 'auth.signOut'
  | 'auth.error'
  | 'auth.signUpSuccess'
  | 'auth.notConfigured';

type Dictionary = Record<TranslationKey, string>;

export const translations: Record<Language, Dictionary> = {
  fr: {
    'header.subtitle': 'Fast-Food & Grill',
    'carousel.specials': 'Nos Spécialités',
    'carousel.new': 'Nouveautés',
    'carousel.deals': 'Offres du Jour',
    'category.all': 'Tous',
    'category.burgers': 'Burgers',
    'category.pizzas': 'Pizzas',
    'category.drinks': 'Boissons',
    'category.desserts': 'Desserts',
    'menu.title': 'Notre Menu',
    'menu.demoNotice': 'Le backend n\'est pas configuré — mode démo actif pour le menu.',
    'menu.loading': 'Chargement du menu...',
    'menu.confirmDeleteCategory': 'Voulez-vous vraiment supprimer cette catégorie ? Tous ses produits seront également supprimés.',
    'menu.newCategory': 'Nouvelle catégorie',
    'menu.addCategory': 'Ajouter catégorie',
    'menu.empty': 'Aucune catégorie pour le moment.',
    'menu.delete': 'Supprimer',
    'menu.productName': 'Nom du produit',
    'menu.productPrice': 'Prix',
    'menu.productDescription': 'Description (optionnel)',
    'menu.available': 'Disponible',
    'menu.unavailable': 'Indisponible',
    'menu.edit': 'Modifier',
    'menu.addProduct': 'Ajouter un produit',
    'menu.save': 'Enregistrer',
    'product.add': 'Ajouter +',
    'qr.title': 'QR Code du Menu',
    'qr.description': 'Scannez pour voir le menu et commander.',
    'qr.generating': 'Génération...',
    'qr.download': 'Télécharger l\'image',
    'qr.copy': 'Copier le lien',
    'qr.copied': 'Lien copié !',
    'cart.title': 'Mon Panier',
    'cart.empty': 'Votre panier est vide.',
    'cart.total': 'Total',
    'cart.checkout': 'Valider la commande',
    'cart.tableNumber': 'Numéro de table (optionnel)',
    'cart.placing': 'Envoi en cours...',
    'order.successTitle': 'Commande envoyée !',
    'order.successDesc': 'Votre commande {ref} a bien été reçue. Le restaurant la prépare.',
    'order.error': "L'envoi a échoué. Veuillez réessayer.",
    'order.done': 'Terminer',
    'home.scanPrompt': "Veuillez scanner le QR Code d'un établissement pour accéder à son menu.",
    'onboarding.title': 'Créer votre Menu',
    'onboarding.subtitle': "Laissez l'IA faire le travail. Prenez votre menu en photo, nous nous occupons du reste.",
    'onboarding.namePlaceholder': "Nom de votre établissement",
    'onboarding.error': "Une erreur est survenue. Veuillez réessayer.",
    'onboarding.import': 'Importer le menu (Photo/PDF)',
    'onboarding.importHint': 'Touchez pour sélectionner un fichier depuis votre téléphone.',
    'onboarding.analyzing': 'Analyse du menu en cours...',
    'onboarding.analyzingHint': 'OpenAI Vision extrait vos produits, prix et descriptions.',
    'onboarding.doneTitle': 'Menu Généré !',
    'onboarding.doneDesc': '{categories} catégories et {products} produits ont été ajoutés à votre base de données avec succès.',
    'onboarding.viewEstablishment': 'Voir mon établissement',
    'onboarding.generate': 'Générer mon application',
    'manager.title': 'Manager IA',
    'manager.greeting': 'Bonjour ! Que souhaitez-vous faire ? (ex: "Ajoute la Pizza 4 Fromages à 6000 FCFA")',
    'manager.actionDone': 'Action exécutée avec succès ! J\'ai bien compris votre demande : "{query}".',
    'manager.pendingOrders': 'Commandes en attente',
    'manager.viewAll': 'Voir tout',
    'manager.thinking': "L'IA réfléchit...",
    'manager.error': "Une erreur est survenue lors du traitement de votre demande.",
    'manager.inputPlaceholder': 'Ex: Retire la bière du menu',
    'nav.assistant': 'Assistant',
    'nav.orders': 'Commandes',
    'nav.menu': 'Menu',
    'nav.settings': 'Réglages',
    'orders.empty': 'Aucune commande pour le moment.',
    'orders.accept': 'Accepter',
    'orders.complete': 'Terminer',
    'orders.cancel': 'Annuler',
    'orders.table': 'Table',
    'order.status.pending': 'En attente',
    'order.status.accepted': 'Acceptée',
    'order.status.completed': 'Terminée',
    'order.status.cancelled': 'Annulée',
    'auth.title': 'Espace gérant',
    'auth.subtitle': 'Connectez-vous pour gérer votre établissement.',
    'auth.email': 'E-mail',
    'auth.password': 'Mot de passe',
    'auth.signIn': 'Se connecter',
    'auth.signUp': 'Créer un compte',
    'auth.loading': 'Veuillez patienter...',
    'auth.toSignUp': "Pas de compte ? S'inscrire",
    'auth.toSignIn': 'Déjà un compte ? Se connecter',
    'auth.signOut': 'Déconnexion',
    'auth.error': 'E-mail ou mot de passe incorrect.',
    'auth.signUpSuccess': 'Compte créé ! Vérifiez vos e-mails pour confirmer.',
    'auth.notConfigured': "Le backend n'est pas configuré — mode démo actif.",
  },
  en: {
    'header.subtitle': 'Fast-Food & Grill',
    'carousel.specials': 'Our Specials',
    'carousel.new': 'New Arrivals',
    'carousel.deals': "Today's Deals",
    'category.all': 'All',
    'category.burgers': 'Burgers',
    'category.pizzas': 'Pizzas',
    'category.drinks': 'Drinks',
    'category.desserts': 'Desserts',
    'menu.title': 'Our Menu',
    'menu.demoNotice': 'Backend is not configured — demo mode active for menu.',
    'menu.loading': 'Loading menu...',
    'menu.confirmDeleteCategory': 'Are you sure you want to delete this category? All its products will also be deleted.',
    'menu.newCategory': 'New category',
    'menu.addCategory': 'Add category',
    'menu.empty': 'No categories yet.',
    'menu.delete': 'Delete',
    'menu.productName': 'Product name',
    'menu.productPrice': 'Price',
    'menu.productDescription': 'Description (optional)',
    'menu.available': 'Available',
    'menu.unavailable': 'Unavailable',
    'menu.edit': 'Edit',
    'menu.addProduct': 'Add a product',
    'menu.save': 'Save',
    'product.add': 'Add +',
    'qr.title': 'Menu QR Code',
    'qr.description': 'Scan to view the menu and place orders.',
    'qr.generating': 'Generating...',
    'qr.download': 'Download Image',
    'qr.copy': 'Copy Link',
    'qr.copied': 'Link Copied!',
    'cart.title': 'My Cart',
    'cart.empty': 'Your cart is empty.',
    'cart.total': 'Total',
    'cart.checkout': 'Place order',
    'cart.tableNumber': 'Table number (optional)',
    'cart.placing': 'Sending...',
    'order.successTitle': 'Order sent!',
    'order.successDesc': 'Your order {ref} has been received. The restaurant is preparing it.',
    'order.error': 'Sending failed. Please try again.',
    'order.done': 'Done',
    'home.scanPrompt': "Please scan an establishment's QR code to access its menu.",
    'onboarding.title': 'Create your Menu',
    'onboarding.subtitle': 'Let AI do the work. Take a photo of your menu and we handle the rest.',
    'onboarding.namePlaceholder': 'Your establishment name',
    'onboarding.error': 'Something went wrong. Please try again.',
    'onboarding.import': 'Import menu (Photo/PDF)',
    'onboarding.importHint': 'Tap to select a file from your phone.',
    'onboarding.analyzing': 'Analyzing menu...',
    'onboarding.analyzingHint': 'OpenAI Vision is extracting your products, prices and descriptions.',
    'onboarding.doneTitle': 'Menu Generated!',
    'onboarding.doneDesc': '{categories} categories and {products} products were successfully added to your database.',
    'onboarding.viewEstablishment': 'View my establishment',
    'onboarding.generate': 'Generate my app',
    'manager.title': 'AI Manager',
    'manager.greeting': 'Hello! What would you like to do? (e.g. "Add the 4 Cheese Pizza for 6000 FCFA")',
    'manager.actionDone': 'Action completed successfully! I understood your request: "{query}".',
    'manager.pendingOrders': 'Pending orders',
    'manager.viewAll': 'View all',
    'manager.thinking': 'AI is thinking...',
    'manager.error': 'Something went wrong while processing your request.',
    'manager.inputPlaceholder': 'e.g. Remove the beer from the menu',
    'nav.assistant': 'Assistant',
    'nav.orders': 'Orders',
    'nav.menu': 'Menu',
    'nav.settings': 'Settings',
    'orders.empty': 'No orders yet.',
    'orders.accept': 'Accept',
    'orders.complete': 'Complete',
    'orders.cancel': 'Cancel',
    'orders.table': 'Table',
    'order.status.pending': 'Pending',
    'order.status.accepted': 'Accepted',
    'order.status.completed': 'Completed',
    'order.status.cancelled': 'Cancelled',
    'auth.title': 'Manager area',
    'auth.subtitle': 'Sign in to manage your establishment.',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.signIn': 'Sign in',
    'auth.signUp': 'Create account',
    'auth.loading': 'Please wait...',
    'auth.toSignUp': "No account? Sign up",
    'auth.toSignIn': 'Already have an account? Sign in',
    'auth.signOut': 'Sign out',
    'auth.error': 'Incorrect email or password.',
    'auth.signUpSuccess': 'Account created! Check your email to confirm.',
    'auth.notConfigured': 'Backend is not configured — demo mode is active.',
  },
  ar: {
    'header.subtitle': 'وجبات سريعة ومشاوي',
    'carousel.specials': 'أطباقنا المميزة',
    'carousel.new': 'الجديد لدينا',
    'carousel.deals': 'عروض اليوم',
    'category.all': 'الكل',
    'category.burgers': 'برغر',
    'category.pizzas': 'بيتزا',
    'category.drinks': 'مشروبات',
    'category.desserts': 'حلويات',
    'menu.title': 'قائمتنا',
    'menu.demoNotice': 'لم يتم تكوين الخادم — الوضع التجريبي مفعّل للقائمة.',
    'menu.loading': 'جارٍ تحميل القائمة...',
    'menu.confirmDeleteCategory': 'هل أنت متأكد من حذف هذه الفئة؟ سيتم حذف جميع منتجاتها.',
    'menu.newCategory': 'فئة جديدة',
    'menu.addCategory': 'إضافة فئة',
    'menu.empty': 'لا توجد فئات حتى الآن.',
    'menu.delete': 'حذف',
    'menu.productName': 'اسم المنتج',
    'menu.productPrice': 'السعر',
    'menu.productDescription': 'الوصف (اختياري)',
    'menu.available': 'متاح',
    'menu.unavailable': 'غير متاح',
    'menu.edit': 'تعديل',
    'menu.addProduct': 'إضافة منتج',
    'menu.save': 'حفظ',
    'product.add': 'أضف +',
    'qr.title': 'رمز QR للقائمة',
    'qr.description': 'امسح الرمز لعرض القائمة وطلب الطعام.',
    'qr.generating': 'جارٍ الإنشاء...',
    'qr.download': 'تنزيل الصورة',
    'qr.copy': 'نسخ الرابط',
    'qr.copied': 'تم نسخ الرابط!',
    'cart.title': 'سلتي',
    'cart.empty': 'سلتك فارغة.',
    'cart.total': 'المجموع',
    'cart.checkout': 'تأكيد الطلب',
    'cart.tableNumber': 'رقم الطاولة (اختياري)',
    'cart.placing': 'جارٍ الإرسال...',
    'order.successTitle': 'تم إرسال الطلب!',
    'order.successDesc': 'تم استلام طلبك {ref}. المطعم يقوم بتحضيره.',
    'order.error': 'فشل الإرسال. يرجى المحاولة مرة أخرى.',
    'order.done': 'تم',
    'home.scanPrompt': 'يرجى مسح رمز QR الخاص بالمنشأة للوصول إلى قائمتها.',
    'onboarding.title': 'أنشئ قائمتك',
    'onboarding.subtitle': 'دع الذكاء الاصطناعي يقوم بالعمل. التقط صورة لقائمتك وسنتولى الباقي.',
    'onboarding.namePlaceholder': 'اسم منشأتك',
    'onboarding.error': 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    'onboarding.import': 'استيراد القائمة (صورة/PDF)',
    'onboarding.importHint': 'انقر لاختيار ملف من هاتفك.',
    'onboarding.analyzing': 'جارٍ تحليل القائمة...',
    'onboarding.analyzingHint': 'يقوم OpenAI Vision باستخراج منتجاتك وأسعارك وأوصافك.',
    'onboarding.doneTitle': 'تم إنشاء القائمة!',
    'onboarding.doneDesc': 'تمت إضافة {categories} فئات و{products} منتجًا إلى قاعدة بياناتك بنجاح.',
    'onboarding.viewEstablishment': 'عرض منشأتي',
    'onboarding.generate': 'أنشئ تطبيقي',
    'manager.title': 'مدير الذكاء الاصطناعي',
    'manager.greeting': 'مرحبًا! ماذا تريد أن تفعل؟ (مثال: "أضف بيتزا 4 أجبان بسعر 6000 فرنك")',
    'manager.actionDone': 'تم تنفيذ الإجراء بنجاح! لقد فهمت طلبك: "{query}".',
    'manager.pendingOrders': 'الطلبات المعلقة',
    'manager.viewAll': 'عرض الكل',
    'manager.thinking': 'الذكاء الاصطناعي يفكر...',
    'manager.error': 'حدث خطأ أثناء معالجة طلبك.',
    'manager.inputPlaceholder': 'مثال: احذف البيرة من القائمة',
    'nav.assistant': 'المساعد',
    'nav.orders': 'الطلبات',
    'nav.menu': 'القائمة',
    'nav.settings': 'الإعدادات',
    'orders.empty': 'لا توجد طلبات حتى الآن.',
    'orders.accept': 'قبول',
    'orders.complete': 'إنهاء',
    'orders.cancel': 'إلغاء',
    'orders.table': 'طاولة',
    'order.status.pending': 'قيد الانتظار',
    'order.status.accepted': 'مقبولة',
    'order.status.completed': 'مكتملة',
    'order.status.cancelled': 'ملغاة',
    'auth.title': 'مساحة المدير',
    'auth.subtitle': 'سجّل الدخول لإدارة منشأتك.',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.signIn': 'تسجيل الدخول',
    'auth.signUp': 'إنشاء حساب',
    'auth.loading': 'يرجى الانتظار...',
    'auth.toSignUp': 'ليس لديك حساب؟ سجّل الآن',
    'auth.toSignIn': 'لديك حساب بالفعل؟ سجّل الدخول',
    'auth.signOut': 'تسجيل الخروج',
    'auth.error': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'auth.signUpSuccess': 'تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد.',
    'auth.notConfigured': 'لم يتم تكوين الخادم — الوضع التجريبي مفعّل.',
  },
  pt: {
    'header.subtitle': 'Fast-Food & Grelhados',
    'carousel.specials': 'As Nossas Especialidades',
    'carousel.new': 'Novidades',
    'carousel.deals': 'Ofertas do Dia',
    'category.all': 'Todos',
    'category.burgers': 'Hambúrgueres',
    'category.pizzas': 'Pizzas',
    'category.drinks': 'Bebidas',
    'category.desserts': 'Sobremesas',
    'menu.title': 'O Nosso Menu',
    'menu.demoNotice': 'O backend não está configurado — modo de demonstração ativo para o menu.',
    'menu.loading': 'A carregar o menu...',
    'menu.confirmDeleteCategory': 'Tem a certeza que deseja eliminar esta categoria? Todos os seus produtos também serão eliminados.',
    'menu.newCategory': 'Nova categoria',
    'menu.addCategory': 'Adicionar categoria',
    'menu.empty': 'Ainda não há categorias.',
    'menu.delete': 'Eliminar',
    'menu.productName': 'Nome do produto',
    'menu.productPrice': 'Preço',
    'menu.productDescription': 'Descrição (opcional)',
    'menu.available': 'Disponível',
    'menu.unavailable': 'Indisponível',
    'menu.edit': 'Editar',
    'menu.addProduct': 'Adicionar produto',
    'menu.save': 'Guardar',
    'product.add': 'Adicionar +',
    'qr.title': 'Código QR do Menu',
    'qr.description': 'Leia o código para ver o menu e fazer pedidos.',
    'qr.generating': 'A gerar...',
    'qr.download': 'Transferir imagem',
    'qr.copy': 'Copiar link',
    'qr.copied': 'Link copiado!',
    'cart.title': 'O Meu Carrinho',
    'cart.empty': 'O seu carrinho está vazio.',
    'cart.total': 'Total',
    'cart.checkout': 'Finalizar pedido',
    'cart.tableNumber': 'Número da mesa (opcional)',
    'cart.placing': 'A enviar...',
    'order.successTitle': 'Pedido enviado!',
    'order.successDesc': 'O seu pedido {ref} foi recebido. O restaurante está a prepará-lo.',
    'order.error': 'O envio falhou. Tente novamente.',
    'order.done': 'Concluir',
    'home.scanPrompt': 'Leia o código QR de um estabelecimento para aceder ao seu menu.',
    'onboarding.title': 'Criar o seu Menu',
    'onboarding.subtitle': 'Deixe a IA fazer o trabalho. Tire uma foto do seu menu e nós tratamos do resto.',
    'onboarding.namePlaceholder': 'Nome do seu estabelecimento',
    'onboarding.error': 'Ocorreu um erro. Tente novamente.',
    'onboarding.import': 'Importar menu (Foto/PDF)',
    'onboarding.importHint': 'Toque para selecionar um ficheiro do seu telemóvel.',
    'onboarding.analyzing': 'A analisar o menu...',
    'onboarding.analyzingHint': 'O OpenAI Vision está a extrair os seus produtos, preços e descrições.',
    'onboarding.doneTitle': 'Menu Gerado!',
    'onboarding.doneDesc': '{categories} categorias e {products} produtos foram adicionados à sua base de dados com sucesso.',
    'onboarding.viewEstablishment': 'Ver o meu estabelecimento',
    'onboarding.generate': 'Gerar a minha aplicação',
    'manager.title': 'Gestor IA',
    'manager.greeting': 'Olá! O que deseja fazer? (ex: "Adiciona a Pizza 4 Queijos por 6000 FCFA")',
    'manager.actionDone': 'Ação executada com sucesso! Compreendi o seu pedido: "{query}".',
    'manager.pendingOrders': 'Pedidos pendentes',
    'manager.viewAll': 'Ver tudo',
    'manager.thinking': 'A IA está a pensar...',
    'manager.error': 'Ocorreu um erro ao processar o seu pedido.',
    'manager.inputPlaceholder': 'ex: Remove a cerveja do menu',
    'nav.assistant': 'Assistente',
    'nav.orders': 'Pedidos',
    'nav.menu': 'Menu',
    'nav.settings': 'Definições',
    'orders.empty': 'Ainda não há pedidos.',
    'orders.accept': 'Aceitar',
    'orders.complete': 'Concluir',
    'orders.cancel': 'Cancelar',
    'orders.table': 'Mesa',
    'order.status.pending': 'Pendente',
    'order.status.accepted': 'Aceite',
    'order.status.completed': 'Concluído',
    'order.status.cancelled': 'Cancelado',
    'auth.title': 'Área do gestor',
    'auth.subtitle': 'Inicie sessão para gerir o seu estabelecimento.',
    'auth.email': 'E-mail',
    'auth.password': 'Palavra-passe',
    'auth.signIn': 'Iniciar sessão',
    'auth.signUp': 'Criar conta',
    'auth.loading': 'Aguarde...',
    'auth.toSignUp': 'Sem conta? Registar-se',
    'auth.toSignIn': 'Já tem conta? Iniciar sessão',
    'auth.signOut': 'Terminar sessão',
    'auth.error': 'E-mail ou palavra-passe incorretos.',
    'auth.signUpSuccess': 'Conta criada! Verifique o seu e-mail para confirmar.',
    'auth.notConfigured': 'O backend não está configurado — modo de demonstração ativo.',
  },
  zh: {
    'header.subtitle': '快餐和烧烤',
    'carousel.specials': '我们的特色菜',
    'carousel.new': '新品上市',
    'carousel.deals': '今日优惠',
    'category.all': '全部',
    'category.burgers': '汉堡',
    'category.pizzas': '披萨',
    'category.drinks': '饮料',
    'category.desserts': '甜点',
    'menu.title': '我们的菜单',
    'menu.demoNotice': '后端未配置 — 菜单演示模式已启用。',
    'menu.loading': '正在加载菜单...',
    'menu.confirmDeleteCategory': '您确定要删除此类别吗？其所有产品也将被删除。',
    'menu.newCategory': '新类别',
    'menu.addCategory': '添加类别',
    'menu.empty': '暂无类别。',
    'menu.delete': '删除',
    'menu.productName': '产品名称',
    'menu.productPrice': '价格',
    'menu.productDescription': '描述（可选）',
    'menu.available': '可提供',
    'menu.unavailable': '不可提供',
    'menu.edit': '编辑',
    'menu.addProduct': '添加产品',
    'menu.save': '保存',
    'product.add': '添加 +',
    'qr.title': '菜单二维码',
    'qr.description': '扫描以查看菜单并下单。',
    'qr.generating': '正在生成...',
    'qr.download': '下载图片',
    'qr.copy': '复制链接',
    'qr.copied': '链接已复制！',
    'cart.title': '我的购物车',
    'cart.empty': '您的购物车是空的。',
    'cart.total': '合计',
    'cart.checkout': '提交订单',
    'cart.tableNumber': '桌号（可选）',
    'cart.placing': '正在发送...',
    'order.successTitle': '订单已发送！',
    'order.successDesc': '您的订单 {ref} 已收到。餐厅正在准备中。',
    'order.error': '发送失败，请重试。',
    'order.done': '完成',
    'home.scanPrompt': '请扫描商家的二维码以查看其菜单。',
    'onboarding.title': '创建您的菜单',
    'onboarding.subtitle': '让 AI 来完成工作。拍下您的菜单照片，其余的交给我们。',
    'onboarding.namePlaceholder': '您的店铺名称',
    'onboarding.error': '出现错误，请重试。',
    'onboarding.import': '导入菜单（照片/PDF）',
    'onboarding.importHint': '点击从您的手机中选择文件。',
    'onboarding.analyzing': '正在分析菜单...',
    'onboarding.analyzingHint': 'OpenAI Vision 正在提取您的产品、价格和描述。',
    'onboarding.doneTitle': '菜单已生成！',
    'onboarding.doneDesc': '已成功将 {categories} 个类别和 {products} 个产品添加到您的数据库。',
    'onboarding.viewEstablishment': '查看我的店铺',
    'onboarding.generate': '生成我的应用',
    'manager.title': 'AI 经理',
    'manager.greeting': '您好！您想做什么？（例如："添加四芝士披萨，售价 6000 FCFA"）',
    'manager.actionDone': '操作已成功执行！我已理解您的请求："{query}"。',
    'manager.pendingOrders': '待处理订单',
    'manager.viewAll': '查看全部',
    'manager.thinking': 'AI 正在思考...',
    'manager.error': '处理您的请求时出错。',
    'manager.inputPlaceholder': '例如：从菜单中移除啤酒',
    'nav.assistant': '助手',
    'nav.orders': '订单',
    'nav.menu': '菜单',
    'nav.settings': '设置',
    'orders.empty': '暂无订单。',
    'orders.accept': '接受',
    'orders.complete': '完成',
    'orders.cancel': '取消',
    'orders.table': '桌号',
    'order.status.pending': '待处理',
    'order.status.accepted': '已接受',
    'order.status.completed': '已完成',
    'order.status.cancelled': '已取消',
    'auth.title': '管理员后台',
    'auth.subtitle': '登录以管理您的店铺。',
    'auth.email': '邮箱',
    'auth.password': '密码',
    'auth.signIn': '登录',
    'auth.signUp': '创建账户',
    'auth.loading': '请稍候...',
    'auth.toSignUp': '没有账户？注册',
    'auth.toSignIn': '已有账户？登录',
    'auth.signOut': '退出登录',
    'auth.error': '邮箱或密码不正确。',
    'auth.signUpSuccess': '账户已创建！请查收邮件以确认。',
    'auth.notConfigured': '后端未配置 — 演示模式已启用。',
  },
};
