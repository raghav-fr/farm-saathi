import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../services/local_ai_service.dart';
import '../services/auth_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkInitialState();
  }

  Future<void> _checkInitialState() async {
    final aiService = context.read<LocalAIService>();
    final authService = context.read<AuthService>();

    // Wait for AI service to check disk for models
    await aiService.initModel();

    if (!mounted) return;

    // Check Auth State
    if (!authService.isAuthenticated) {
      context.go('/login');
      return;
    }

    // Check Download State
    if (!aiService.isDownloadComplete) {
      context.go('/download');
      return;
    }

    // Both Authenticated and Downloaded
    context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Center(
          child: CircularProgressIndicator(color: Colors.green),
        ),
      ),
    );
  }
}
