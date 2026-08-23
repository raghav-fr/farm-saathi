import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';

import 'services/local_ai_service.dart';
import 'services/auth_service.dart';
import 'services/location_service.dart';
import 'services/api_service.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'router.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  
  // Note: Before running, the user must run `flutterfire configure` to generate firebase_options.dart
  // and pass DefaultFirebaseOptions.currentPlatform here.
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint("Firebase not yet configured: $e");
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LocalAIService()),
        ChangeNotifierProvider(create: (_) => AuthService()),
        ChangeNotifierProvider(create: (_) => LocationService()),
        Provider(create: (_) => ApiService()),
      ],
      child: const FarmSaathiApp(),
    ),
  );
}

class FarmSaathiApp extends StatelessWidget {
  const FarmSaathiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'FarmSaathi App',
      debugShowCheckedModeBanner: false,
      routerConfig: appRouter,
      theme: AppTheme.themeData,
    );
  }
}

