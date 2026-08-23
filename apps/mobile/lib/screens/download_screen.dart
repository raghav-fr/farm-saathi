import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../services/local_ai_service.dart';

class DownloadScreen extends StatefulWidget {
  const DownloadScreen({super.key});

  @override
  State<DownloadScreen> createState() => _DownloadScreenState();
}

class _DownloadScreenState extends State<DownloadScreen> {
  bool _started = false;

  void _startDownload() async {
    setState(() => _started = true);
    final aiService = context.read<LocalAIService>();
    await aiService.downloadAllModels();
    if (mounted && aiService.isModelLoaded) {
      context.go('/login');
    }
  }


  @override
  Widget build(BuildContext context) {
    final aiService = context.watch<LocalAIService>();

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.psychology_outlined, size: 64, color: Color(0xFF22C55E)),
                  const SizedBox(height: 24),
                  const Text(
                    'Setup AI Models',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'FarmSaathi requires a one-time download for AI models.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.black54,
                      fontSize: 14,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 48),

                  if (!_started)
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF22C55E),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        onPressed: _startDownload,
                        child: const Text(
                          'Download (2.4 GB)',
                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                      ),
                    )
                  else if (aiService.isModelLoaded)
                    Column(
                      children: [
                        const Icon(Icons.check_circle_rounded, color: Color(0xFF22C55E), size: 40),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF22C55E),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                            ),
                            onPressed: () => context.go('/login'),
                            child: const Text(
                              'Continue',
                              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                            ),
                          ),
                        ),
                      ],
                    )
                  else
                    Column(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: aiService.overallProgress,
                            minHeight: 6,
                            color: const Color(0xFF22C55E),
                            backgroundColor: Colors.black12,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                aiService.statusMessage,
                                style: const TextStyle(color: Colors.black54, fontSize: 12),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              aiService.progressText.isNotEmpty ? aiService.progressText : '${(aiService.overallProgress * 100).toStringAsFixed(1)}%',
                              style: const TextStyle(
                                color: Color(0xFF22C55E),
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 16),
                        const Text(
                          'You can minimize the app. Download continues in background.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 11, color: Colors.black38),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
