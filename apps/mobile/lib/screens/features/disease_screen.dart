import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../services/api_service.dart';
import '../../services/local_ai_service.dart';
import '../../theme/app_theme.dart';

class DiseaseScreen extends StatefulWidget {
  const DiseaseScreen({super.key});

  @override
  State<DiseaseScreen> createState() => _DiseaseScreenState();
}

class _DiseaseScreenState extends State<DiseaseScreen> {
  final ImagePicker _picker = ImagePicker();
  File? _imageFile;
  bool _isLoading = false;
  Map<String, dynamic>? _result;

  Future<void> _pickImage(ImageSource source) async {
    final picked = await _picker.pickImage(source: source, imageQuality: 80);
    if (picked != null) {
      setState(() {
        _imageFile = File(picked.path);
        _result = null;
      });
    }
  }

  Future<void> _analyzeImage() async {
    if (_imageFile == null) return;

    setState(() => _isLoading = true);

    try {
      final apiService = context.read<ApiService>();
      final result = await apiService.predictDisease(
        imagePath: _imageFile!.path,
      );

      if (mounted) {
        setState(() {
          _result = result;
        });
      }
    } catch (e) {
      debugPrint('API failed, falling back to Local AI: $e');
      if (mounted) {
        try {
          final localAi = context.read<LocalAIService>();
          final result = await localAi.analyzeImage(_imageFile!);
          if (mounted) {
            setState(() {
              _result = result;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Offline mode: Using local AI fallback.', style: TextStyle(color: Colors.white)), backgroundColor: Colors.orange),
            );
          }
        } catch (localError) {
          if (mounted) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text('AI Analysis failed: $localError')));
          }
        }
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.brand600),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'AI Disease Detection',
                style: Theme.of(context).textTheme.headlineMedium
                    ?.copyWith(color: AppTheme.brand600),
              ),
              const SizedBox(height: 8),
              Text(
                'Using the on-device Edge Vision Model to diagnose the plant.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 24),

              if (_imageFile != null)
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.file(
                        _imageFile!,
                        height: 300,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _imageFile = null;
                            _result = null;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Colors.black54,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.close,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                    ),
                  ],
                )
              else
                GlassCard(
                  height: 300,
                  onTap: () => _pickImage(ImageSource.gallery),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.add_photo_alternate_rounded,
                        size: 64,
                        color: AppTheme.brand500.withValues(alpha: 0.7),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),

              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickImage(ImageSource.camera),
                      icon: const Icon(Icons.camera_alt),
                      label: const Text('Camera'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.brand600,
                        side: const BorderSide(color: AppTheme.brand300),
                        padding: const EdgeInsets.all(16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickImage(ImageSource.gallery),
                      icon: const Icon(Icons.photo_library),
                      label: const Text('Gallery'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.brand600,
                        side: const BorderSide(color: AppTheme.brand300),
                        padding: const EdgeInsets.all(16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 32),
              GradientButton(
                text: 'Diagnose Image',
                isLoading: _isLoading,
                onPressed: () {
                  if (_imageFile != null) _analyzeImage();
                },
              ),

              if (_result != null) ...[
                const SizedBox(height: 32),
                GlassCard(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.warning_amber_rounded,
                            color: AppTheme.error,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Diagnosis (${_result!['confidence']})',
                            style: const TextStyle(
                              color: AppTheme.error,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _result!['disease'] ?? 'Unknown',
                        style: Theme.of(context).textTheme.headlineMedium
                            ?.copyWith(color: AppTheme.error),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Local Management Plan',
                        style: TextStyle(
                          color: AppTheme.brand600,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _result!['management'] ?? 'No management data',
                        style: Theme.of(context).textTheme.bodyMedium
                            ?.copyWith(height: 1.5),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
