import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

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
  Map<String, String>? _result;

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
      final aiService = context.read<LocalAIService>();
      final result = await aiService.analyzeImage(_imageFile!);
      
      setState(() {
        _result = result;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('AI Analysis failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'AI Disease Detection',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppTheme.brand600),
          ),
          const SizedBox(height: 8),
          Text(
            'Using the on-device Edge Vision Model to diagnose the plant.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          
          if (_imageFile != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.file(_imageFile!, height: 300, fit: BoxFit.cover),
            )
          else
            Container(
              height: 300,
              decoration: BoxDecoration(
                color: AppTheme.brand500.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.brand500.withValues(alpha: 0.1)),
              ),
              child: const Center(
                child: Icon(Icons.add_a_photo_outlined, size: 64, color: AppTheme.brand200),
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
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
                      Icon(Icons.warning_amber_rounded, color: AppTheme.error),
                      const SizedBox(width: 8),
                      Text('Diagnosis (${_result!['confidence']})', style: const TextStyle(color: AppTheme.error, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _result!['disease'] ?? 'Unknown',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppTheme.error),
                  ),
                  const SizedBox(height: 16),
                  const Text('Local Management Plan', style: TextStyle(color: AppTheme.brand600, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(_result!['management'] ?? 'No management data', style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.5)),
                ],
              ),
            ),
          ]
        ],
      ),
    );
  }
}
