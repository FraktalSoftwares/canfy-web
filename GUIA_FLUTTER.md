# Guia de Desenvolvimento Flutter - Módulo Paciente Canfy

## 📋 Índice

1. [Configuração Inicial](#configuração-inicial)
2. [Estrutura de Projeto](#estrutura-de-projeto)
3. [Integração com Supabase](#integração-com-supabase)
4. [Arquitetura Recomendada](#arquitetura-recomendada)
5. [Exemplos de Código](#exemplos-de-código)
6. [Design System Flutter](#design-system-flutter)
7. [Navegação](#navegação)
8. [Gerenciamento de Estado](#gerenciamento-de-estado)
9. [Notificações Push](#notificações-push)
10. [Upload de Arquivos](#upload-de-arquivos)

---

## 🚀 Configuração Inicial

### Dependências Necessárias

Adicione ao arquivo `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Supabase
  supabase_flutter: ^2.0.0
  
  # Gerenciamento de Estado
  provider: ^6.1.0
  # ou
  riverpod: ^2.4.0
  # ou
  bloc: ^8.1.0
  flutter_bloc: ^8.1.0
  
  # Navegação
  go_router: ^12.0.0
  
  # HTTP e Networking
  dio: ^5.3.0
  
  # Armazenamento Local
  shared_preferences: ^2.2.0
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  
  # Validação de Formulários
  formz: ^0.6.0
  
  # Utilitários
  intl: ^0.18.0  # Formatação de datas
  mask_text_input_formatter: ^2.0.0  # Máscaras de input
  image_picker: ^1.0.0  # Seleção de imagens
  file_picker: ^6.0.0  # Seleção de arquivos
  path_provider: ^2.1.0  # Caminhos do sistema
  cached_network_image: ^3.3.0  # Cache de imagens
  
  # Notificações
  firebase_messaging: ^14.7.0
  flutter_local_notifications: ^16.0.0
  
  # Ícones
  flutter_svg: ^2.0.0
  font_awesome_flutter: ^10.5.0
  
  # Loading e Feedback
  flutter_spinkit: ^5.2.0
  fluttertoast: ^8.2.0
  
  # Permissões
  permission_handler: ^11.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.0
  hive_generator: ^2.0.0
```

### Configuração do Supabase

Crie um arquivo `lib/config/supabase_config.dart`:

```dart
class SupabaseConfig {
  static const String url = 'https://agqqxxfrnpuriwrmwdrq.supabase.co';
  static const String anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncXF4eGZybnB1cml3cm13ZHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDAzNjAsImV4cCI6MjA3NjY3NjM2MH0.uox5JvNblqcQlSD6o-Rv4ZWYiVopVbyE-tnHSVjuVw0';
}
```

Inicialize no `main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/supabase_config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: SupabaseConfig.url,
    anonKey: SupabaseConfig.anonKey,
  );
  
  runApp(const MyApp());
}
```

---

## 📁 Estrutura de Projeto

```
lib/
├── main.dart
├── app.dart
├── config/
│   ├── supabase_config.dart
│   └── theme_config.dart
├── core/
│   ├── constants/
│   │   ├── colors.dart
│   │   ├── strings.dart
│   │   └── dimensions.dart
│   ├── utils/
│   │   ├── validators.dart
│   │   ├── formatters.dart
│   │   └── date_utils.dart
│   └── widgets/
│       ├── loading_widget.dart
│       ├── error_widget.dart
│       └── empty_state_widget.dart
├── data/
│   ├── models/
│   │   ├── paciente_model.dart
│   │   ├── receita_model.dart
│   │   ├── pedido_model.dart
│   │   ├── produto_model.dart
│   │   └── notificacao_model.dart
│   ├── repositories/
│   │   ├── auth_repository.dart
│   │   ├── paciente_repository.dart
│   │   ├── receita_repository.dart
│   │   ├── pedido_repository.dart
│   │   ├── produto_repository.dart
│   │   └── notificacao_repository.dart
│   └── services/
│       ├── supabase_service.dart
│       └── storage_service.dart
├── domain/
│   ├── entities/
│   │   ├── paciente_entity.dart
│   │   ├── receita_entity.dart
│   │   └── pedido_entity.dart
│   └── usecases/
│       ├── get_paciente_usecase.dart
│       ├── get_receitas_usecase.dart
│       └── get_pedidos_usecase.dart
├── presentation/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   └── forgot_password_screen.dart
│   │   ├── home/
│   │   │   └── home_screen.dart
│   │   ├── perfil/
│   │   │   ├── perfil_screen.dart
│   │   │   └── editar_perfil_screen.dart
│   │   ├── receitas/
│   │   │   ├── receitas_list_screen.dart
│   │   │   └── receita_detail_screen.dart
│   │   ├── pedidos/
│   │   │   ├── pedidos_list_screen.dart
│   │   │   └── pedido_detail_screen.dart
│   │   ├── produtos/
│   │   │   ├── produtos_list_screen.dart
│   │   │   └── produto_detail_screen.dart
│   │   ├── documentos/
│   │   │   └── documentos_screen.dart
│   │   └── notificacoes/
│   │       └── notificacoes_screen.dart
│   ├── widgets/
│   │   ├── receita_card.dart
│   │   ├── pedido_card.dart
│   │   ├── produto_card.dart
│   │   └── notificacao_item.dart
│   └── providers/  # ou bloc/ ou controllers/
│       ├── auth_provider.dart
│       ├── paciente_provider.dart
│       ├── receitas_provider.dart
│       └── pedidos_provider.dart
└── routes/
    └── app_router.dart
```

---

## 🔌 Integração com Supabase

### Serviço Base

```dart
// lib/data/services/supabase_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static final SupabaseClient _client = Supabase.instance.client;
  
  static SupabaseClient get client => _client;
  
  // Auth
  static User? get currentUser => _client.auth.currentUser;
  static Session? get currentSession => _client.auth.currentSession;
  
  // Verificar autenticação
  static bool get isAuthenticated => currentUser != null;
  
  // Login
  static Future<AuthResponse> signInWithPassword({
    required String email,
    required String password,
  }) async {
    return await _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }
  
  // Logout
  static Future<void> signOut() async {
    await _client.auth.signOut();
  }
  
  // Recuperar senha
  static Future<void> resetPassword(String email) async {
    await _client.auth.resetPasswordForEmail(email);
  }
  
  // Obter perfil do usuário
  static Future<Map<String, dynamic>?> getProfile() async {
    if (currentUser == null) return null;
    
    final response = await _client
        .from('profiles')
        .select()
        .eq('id', currentUser!.id)
        .single();
    
    return response;
  }
}
```

### Repository Pattern

```dart
// lib/data/repositories/paciente_repository.dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/paciente_model.dart';
import '../../data/services/supabase_service.dart';

class PacienteRepository {
  final SupabaseClient _client = SupabaseService.client;
  
  // Buscar paciente por user_id
  Future<PacienteModel?> getPacienteByUserId(String userId) async {
    try {
      final response = await _client
          .from('pacientes')
          .select('''
            *,
            profiles:user_id (
              nome_completo,
              telefone,
              foto_perfil_url,
              ativo
            )
          ''')
          .eq('user_id', userId)
          .single();
      
      return PacienteModel.fromJson(response);
    } catch (e) {
      throw Exception('Erro ao buscar paciente: $e');
    }
  }
  
  // Atualizar dados do paciente
  Future<void> updatePaciente({
    required String pacienteId,
    String? telefone,
    String? cpf,
    String? dataNascimento,
    String? enderecoCompleto,
  }) async {
    try {
      // Atualizar tabela pacientes
      final pacienteUpdate = <String, dynamic>{};
      if (cpf != null) pacienteUpdate['cpf'] = cpf;
      if (dataNascimento != null) pacienteUpdate['data_nascimento'] = dataNascimento;
      if (enderecoCompleto != null) pacienteUpdate['endereco_completo'] = enderecoCompleto;
      pacienteUpdate['updated_at'] = DateTime.now().toIso8601String();
      
      if (pacienteUpdate.isNotEmpty) {
        await _client
            .from('pacientes')
            .update(pacienteUpdate)
            .eq('id', pacienteId);
      }
      
      // Atualizar telefone na tabela profiles
      if (telefone != null) {
        final paciente = await _client
            .from('pacientes')
            .select('user_id')
            .eq('id', pacienteId)
            .single();
        
        await _client
            .from('profiles')
            .update({
              'telefone': telefone,
              'updated_at': DateTime.now().toIso8601String(),
            })
            .eq('id', paciente['user_id']);
      }
    } catch (e) {
      throw Exception('Erro ao atualizar paciente: $e');
    }
  }
}
```

---

## 🏗️ Arquitetura Recomendada

### Clean Architecture com Provider

```dart
// lib/presentation/providers/paciente_provider.dart
import 'package:flutter/foundation.dart';
import '../../data/models/paciente_model.dart';
import '../../data/repositories/paciente_repository.dart';

class PacienteProvider with ChangeNotifier {
  final PacienteRepository _repository = PacienteRepository();
  
  PacienteModel? _paciente;
  bool _isLoading = false;
  String? _error;
  
  PacienteModel? get paciente => _paciente;
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  Future<void> loadPaciente(String userId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      _paciente = await _repository.getPacienteByUserId(userId);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<void> updatePaciente({
    String? telefone,
    String? cpf,
    String? dataNascimento,
    String? enderecoCompleto,
  }) async {
    if (_paciente == null) return;
    
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      await _repository.updatePaciente(
        pacienteId: _paciente!.id,
        telefone: telefone,
        cpf: cpf,
        dataNascimento: dataNascimento,
        enderecoCompleto: enderecoCompleto,
      );
      
      // Recarregar dados
      await loadPaciente(_paciente!.userId);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
```

---

## 💻 Exemplos de Código

### Model (Paciente)

```dart
// lib/data/models/paciente_model.dart
class PacienteModel {
  final String id;
  final String userId;
  final String nomeCompleto;
  final String email;
  final String? telefone;
  final String cpf;
  final DateTime dataNascimento;
  final String? enderecoCompleto;
  final int totalConsultas;
  final int totalPedidos;
  final DateTime? ultimoAcesso;
  final DateTime createdAt;
  final bool ativo;
  final String? fotoPerfilUrl;
  
  PacienteModel({
    required this.id,
    required this.userId,
    required this.nomeCompleto,
    required this.email,
    this.telefone,
    required this.cpf,
    required this.dataNascimento,
    this.enderecoCompleto,
    required this.totalConsultas,
    required this.totalPedidos,
    this.ultimoAcesso,
    required this.createdAt,
    required this.ativo,
    this.fotoPerfilUrl,
  });
  
  factory PacienteModel.fromJson(Map<String, dynamic> json) {
    return PacienteModel(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      nomeCompleto: json['profiles']?['nome_completo'] ?? json['nome_completo'] as String,
      email: json['email'] as String,
      telefone: json['profiles']?['telefone'] ?? json['telefone'] as String?,
      cpf: json['cpf'] as String,
      dataNascimento: DateTime.parse(json['data_nascimento'] as String),
      enderecoCompleto: json['endereco_completo'] as String?,
      totalConsultas: json['total_consultas'] as int? ?? 0,
      totalPedidos: json['total_pedidos'] as int? ?? 0,
      ultimoAcesso: json['ultimo_acesso'] != null 
          ? DateTime.parse(json['ultimo_acesso'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      ativo: json['profiles']?['ativo'] ?? json['ativo'] as bool? ?? true,
      fotoPerfilUrl: json['profiles']?['foto_perfil_url'] ?? json['foto_perfil_url'] as String?,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'nome_completo': nomeCompleto,
      'email': email,
      'telefone': telefone,
      'cpf': cpf,
      'data_nascimento': dataNascimento.toIso8601String().split('T')[0],
      'endereco_completo': enderecoCompleto,
      'total_consultas': totalConsultas,
      'total_pedidos': totalPedidos,
      'ultimo_acesso': ultimoAcesso?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'ativo': ativo,
      'foto_perfil_url': fotoPerfilUrl,
    };
  }
}
```

### Repository (Receitas)

```dart
// lib/data/repositories/receita_repository.dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/receita_model.dart';
import '../../data/services/supabase_service.dart';

class ReceitaRepository {
  final SupabaseClient _client = SupabaseService.client;
  
  // Listar receitas do paciente
  Future<List<ReceitaModel>> getReceitasByPacienteId(String pacienteId) async {
    try {
      final response = await _client
          .from('receitas')
          .select('''
            *,
            medico:medicos (
              nome,
              crm,
              uf_crm
            ),
            receita_itens (
              *,
              produto:produtos (*)
            )
          ''')
          .eq('paciente_id', pacienteId)
          .order('data_emissao', ascending: false);
      
      return (response as List)
          .map((json) => ReceitaModel.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Erro ao buscar receitas: $e');
    }
  }
  
  // Buscar receita por ID
  Future<ReceitaModel?> getReceitaById(String receitaId) async {
    try {
      final response = await _client
          .from('receitas')
          .select('''
            *,
            medico:medicos (
              nome,
              crm,
              uf_crm
            ),
            receita_itens (
              *,
              produto:produtos (*)
            )
          ''')
          .eq('id', receitaId)
          .single();
      
      return ReceitaModel.fromJson(response);
    } catch (e) {
      throw Exception('Erro ao buscar receita: $e');
    }
  }
}
```

### Screen (Lista de Receitas)

```dart
// lib/presentation/screens/receitas/receitas_list_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/receitas_provider.dart';
import '../../widgets/receita_card.dart';
import 'receita_detail_screen.dart';

class ReceitasListScreen extends StatelessWidget {
  const ReceitasListScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final receitasProvider = Provider.of<ReceitasProvider>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Minhas Receitas'),
      ),
      body: _buildBody(context, receitasProvider),
    );
  }
  
  Widget _buildBody(BuildContext context, ReceitasProvider provider) {
    if (provider.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    
    if (provider.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Erro: ${provider.error}'),
            ElevatedButton(
              onPressed: () => provider.loadReceitas(),
              child: const Text('Tentar novamente'),
            ),
          ],
        ),
      );
    }
    
    if (provider.receitas.isEmpty) {
      return const Center(
        child: Text('Nenhuma receita encontrada'),
      );
    }
    
    return RefreshIndicator(
      onRefresh: () => provider.loadReceitas(),
      child: ListView.builder(
        itemCount: provider.receitas.length,
        itemBuilder: (context, index) {
          final receita = provider.receitas[index];
          return ReceitaCard(
            receita: receita,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ReceitaDetailScreen(receitaId: receita.id),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
```

---

## 🎨 Design System Flutter

### Cores

```dart
// lib/core/constants/colors.dart
import 'package:flutter/material.dart';

class AppColors {
  // Cores principais
  static const Color background = Color(0xFFF9FAF9);
  static const Color foreground = Color(0xFF333333);
  
  // Verde primário
  static const Color primary = Color(0xFF2FAE66);
  static const Color primaryDark = Color(0xFF1E7E46);
  static const Color primaryHover = Color(0xFF44C97C);
  
  // Cores de status
  static const Color statusSuccess = Color(0xFF4CAF50);
  static const Color statusWarning = Color(0xFFFFC107);
  static const Color statusError = Color(0xFFF44336);
  
  // Cores de cards
  static const Color cardGreen = Color(0xFFE8F5E9);
  static const Color cardYellow = Color(0xFFFFF9E6);
  static const Color cardBlue = Color(0xFFE3F2FD);
  
  // Cores neutras
  static const Color border = Color(0xFFDADADA);
  static const Color muted = Color(0xFFA0A0A0);
  static const Color mutedForeground = Color(0xFFA0A0A0);
}
```

### Tema

```dart
// lib/config/theme_config.dart
import 'package:flutter/material.dart';
import '../core/constants/colors.dart';

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      fontFamily: 'NunitoSans',
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        secondary: AppColors.primaryHover,
        error: AppColors.statusError,
        background: AppColors.background,
        surface: Colors.white,
      ),
      scaffoldBackgroundColor: AppColors.background,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.foreground,
        elevation: 0,
      ),
      cardTheme: CardTheme(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        filled: true,
        fillColor: Colors.white,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
    );
  }
}
```

### Tipografia

```dart
// lib/core/constants/text_styles.dart
import 'package:flutter/material.dart';

class AppTextStyles {
  static const TextStyle heading1 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: AppColors.foreground,
  );
  
  static const TextStyle heading2 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.bold,
    color: AppColors.foreground,
  );
  
  static const TextStyle body = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.normal,
    color: AppColors.foreground,
  );
  
  static const TextStyle bodySmall = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.normal,
    color: AppColors.mutedForeground,
  );
  
  static const TextStyle caption = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.normal,
    color: AppColors.mutedForeground,
  );
}
```

---

## 🧭 Navegação

### GoRouter

```dart
// lib/routes/app_router.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../presentation/screens/auth/login_screen.dart';
import '../presentation/screens/home/home_screen.dart';
import '../presentation/screens/receitas/receitas_list_screen.dart';
import '../presentation/screens/pedidos/pedidos_list_screen.dart';
import '../data/services/supabase_service.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isAuthenticated = SupabaseService.isAuthenticated;
      final isLoginPage = state.matchedLocation == '/login';
      
      if (!isAuthenticated && !isLoginPage) {
        return '/login';
      }
      
      if (isAuthenticated && isLoginPage) {
        return '/home';
      }
      
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/receitas',
        builder: (context, state) => const ReceitasListScreen(),
      ),
      GoRoute(
        path: '/pedidos',
        builder: (context, state) => const PedidosListScreen(),
      ),
    ],
  );
}
```

---

## 📦 Gerenciamento de Estado

### Provider Setup

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'presentation/providers/auth_provider.dart';
import 'presentation/providers/paciente_provider.dart';
import 'presentation/providers/receitas_provider.dart';
import 'routes/app_router.dart';
import 'config/theme_config.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => PacienteProvider()),
        ChangeNotifierProvider(create: (_) => ReceitasProvider()),
      ],
      child: MaterialApp.router(
        title: 'Canfy',
        theme: AppTheme.lightTheme,
        routerConfig: AppRouter.router,
      ),
    );
  }
}
```

---

## 🔔 Notificações Push

### Configuração

```dart
// lib/data/services/notification_service.dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class NotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  
  static Future<void> initialize() async {
    // Solicitar permissão
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    
    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      // Obter token
      String? token = await _messaging.getToken();
      print('FCM Token: $token');
      
      // Salvar token no Supabase (se necessário)
      // await Supabase.instance.client
      //     .from('user_tokens')
      //     .upsert({'user_id': userId, 'token': token});
    }
    
    // Configurar notificações locais
    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
    );
    
    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );
    
    // Escutar mensagens em foreground
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    
    // Escutar quando app é aberto via notificação
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationOpened);
  }
  
  static void _onNotificationTap(NotificationResponse response) {
    // Navegar para tela específica baseada no payload
  }
  
  static Future<void> _handleForegroundMessage(RemoteMessage message) async {
    // Mostrar notificação local quando app está em foreground
    await _localNotifications.show(
      message.hashCode,
      message.notification?.title,
      message.notification?.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'canfy_channel',
          'Canfy Notifications',
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
    );
  }
  
  static void _handleNotificationOpened(RemoteMessage message) {
    // Navegar para tela específica
  }
}
```

---

## 📤 Upload de Arquivos

### Storage Service

```dart
// lib/data/services/storage_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';

class StorageService {
  static final SupabaseClient _client = Supabase.instance.client;
  static const String bucketName = 'documentos';
  
  // Upload de documento
  static Future<String> uploadDocument({
    required String userId,
    required File file,
    required String fileName,
  }) async {
    try {
      final filePath = '$userId/$fileName';
      
      await _client.storage.from(bucketName).upload(
        filePath,
        file,
        fileOptions: const FileOptions(
          upsert: true,
        ),
      );
      
      // Obter URL pública
      final publicUrl = _client.storage.from(bucketName).getPublicUrl(filePath);
      
      return publicUrl;
    } catch (e) {
      throw Exception('Erro ao fazer upload: $e');
    }
  }
  
  // Salvar registro do documento
  static Future<void> saveDocumentRecord({
    required String pacienteId,
    required String tipo,
    required String nomeArquivo,
    required String arquivoUrl,
    required int tamanhoBytes,
    required String enviadoPor,
  }) async {
    try {
      await _client.from('documentos').insert({
        'paciente_id': pacienteId,
        'tipo': tipo,
        'nome_arquivo': nomeArquivo,
        'arquivo_url': arquivoUrl,
        'tamanho_bytes': tamanhoBytes,
        'enviado_por': enviadoPor,
      });
    } catch (e) {
      throw Exception('Erro ao salvar registro: $e');
    }
  }
  
  // Upload completo (arquivo + registro)
  static Future<void> uploadDocumentComplete({
    required String userId,
    required String pacienteId,
    required File file,
    required String tipo,
    required String nomeArquivo,
  }) async {
    try {
      // 1. Upload do arquivo
      final arquivoUrl = await uploadDocument(
        userId: userId,
        file: file,
        fileName: nomeArquivo,
      );
      
      // 2. Salvar registro
      await saveDocumentRecord(
        pacienteId: pacienteId,
        tipo: tipo,
        nomeArquivo: nomeArquivo,
        arquivoUrl: arquivoUrl,
        tamanhoBytes: await file.length(),
        enviadoPor: userId,
      );
    } catch (e) {
      throw Exception('Erro no upload completo: $e');
    }
  }
}
```

### Exemplo de Uso

```dart
// Em uma tela
Future<void> _pickAndUploadDocument() async {
  FilePickerResult? result = await FilePicker.platform.pickFiles(
    type: FileType.custom,
    allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg'],
  );
  
  if (result != null) {
    File file = File(result.files.single.path!);
    
    try {
      await StorageService.uploadDocumentComplete(
        userId: currentUserId,
        pacienteId: pacienteId,
        file: file,
        tipo: 'identidade',
        nomeArquivo: result.files.single.name,
      );
      
      // Mostrar sucesso
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Documento enviado com sucesso!')),
      );
    } catch (e) {
      // Mostrar erro
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro: $e')),
      );
    }
  }
}
```

---

## 📝 Validações

### Validators

```dart
// lib/core/utils/validators.dart
class Validators {
  // CPF
  static String? cpf(String? value) {
    if (value == null || value.isEmpty) {
      return 'CPF é obrigatório';
    }
    
    final regex = RegExp(r'^\d{3}\.\d{3}\.\d{3}-\d{2}$');
    if (!regex.hasMatch(value)) {
      return 'CPF inválido. Use o formato: 123.456.789-00';
    }
    
    return null;
  }
  
  // Telefone
  static String? telefone(String? value) {
    if (value == null || value.isEmpty) {
      return 'Telefone é obrigatório';
    }
    
    final regex = RegExp(r'^\(\d{2}\)\s\d{4,5}-\d{4}$');
    if (!regex.hasMatch(value)) {
      return 'Telefone inválido. Use o formato: (11) 99999-9999';
    }
    
    return null;
  }
  
  // Email
  static String? email(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email é obrigatório';
    }
    
    final regex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!regex.hasMatch(value)) {
      return 'Email inválido';
    }
    
    return null;
  }
  
  // Data de nascimento
  static String? dataNascimento(String? value) {
    if (value == null || value.isEmpty) {
      return 'Data de nascimento é obrigatória';
    }
    
    final regex = RegExp(r'^\d{4}-\d{2}-\d{2}$');
    if (!regex.hasMatch(value)) {
      return 'Data inválida. Use o formato: YYYY-MM-DD';
    }
    
    return null;
  }
}
```

### Formatters

```dart
// lib/core/utils/formatters.dart
import 'package:intl/intl.dart';
import 'package:mask_text_input_formatter/mask_text_input_formatter.dart';

class Formatters {
  // CPF
  static final cpfFormatter = MaskTextInputFormatter(
    mask: '###.###.###-##',
    filter: {"#": RegExp(r'[0-9]')},
  );
  
  // Telefone
  static final telefoneFormatter = MaskTextInputFormatter(
    mask: '(##) #####-####',
    filter: {"#": RegExp(r'[0-9]')},
  );
  
  // Data brasileira
  static String formatDate(DateTime date) {
    return DateFormat('dd/MM/yyyy').format(date);
  }
  
  // Data e hora brasileira
  static String formatDateTime(DateTime dateTime) {
    return DateFormat('dd/MM/yyyy • HH:mm').format(dateTime);
  }
  
  // Valor monetário
  static String formatCurrency(double value) {
    return NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$').format(value);
  }
}
```

---

## 🔄 Realtime Subscriptions

### Exemplo de Subscription

```dart
// Escutar mudanças em pedidos
class PedidosProvider with ChangeNotifier {
  RealtimeChannel? _channel;
  
  void subscribeToPedidos(String pacienteId) {
    _channel = Supabase.instance.client
        .channel('pedidos-changes')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'pedidos',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'paciente_id',
            value: pacienteId,
          ),
          callback: (payload) {
            // Atualizar lista de pedidos
            loadPedidos();
          },
        )
        .subscribe();
  }
  
  void unsubscribe() {
    _channel?.unsubscribe();
  }
  
  @override
  void dispose() {
    unsubscribe();
    super.dispose();
  }
}
```

---

## 📱 Recursos Adicionais

### Widgets Reutilizáveis

```dart
// lib/core/widgets/loading_widget.dart
import 'package:flutter/material.dart';

class LoadingWidget extends StatelessWidget {
  const LoadingWidget({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator(),
    );
  }
}

// lib/core/widgets/error_widget.dart
class ErrorWidget extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  
  const ErrorWidget({
    Key? key,
    required this.message,
    this.onRetry,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(message),
          if (onRetry != null)
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('Tentar novamente'),
            ),
        ],
      ),
    );
  }
}
```

---

## 🎯 Próximos Passos

1. **Configurar Firebase** para notificações push
2. **Implementar autenticação** completa
3. **Criar modelos** para todas as entidades
4. **Implementar repositories** para todas as tabelas
5. **Criar providers/blocs** para gerenciamento de estado
6. **Desenvolver telas** seguindo o design system
7. **Implementar validações** de formulários
8. **Configurar upload** de documentos
9. **Implementar realtime** subscriptions
10. **Testes** unitários e de integração

---

**Última atualização**: Dezembro 2024
**Versão**: 1.0

