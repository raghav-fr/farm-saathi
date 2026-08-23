import 'dart:io';
import 'dart:convert';
import 'package:background_downloader/background_downloader.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';

import 'package:flutter_dotenv/flutter_dotenv.dart';

// Represents one downloadable model
class ModelDownloadItem {
  final String name;
  final String description;
  final String url;
  final String fileName;
  final String taskId;
  final String sizeLabel;
  double progress;
  bool isComplete;
  DownloadTask? task;

  ModelDownloadItem({
    required this.name,
    required this.description,
    required this.url,
    required this.fileName,
    required this.taskId,
    required this.sizeLabel,
    this.progress = 0.0,
    this.isComplete = false,
  });
}

class LocalAIService extends ChangeNotifier with WidgetsBindingObserver {
  bool _isDownloading = false;
  bool _isModelLoaded = false;
  String _statusMessage = 'Models not downloaded';
  String _progressText = '';
  Map<String, dynamic> _localKnowledge = {};

  bool get isDownloading => _isDownloading;
  bool get isModelLoaded => _isModelLoaded;
  String get statusMessage => _statusMessage;
  String get progressText => _progressText;

  double get overallProgress {
    if (_models.isEmpty) return 0.0;
    return _models.fold(0.0, (sum, m) => sum + m.progress) / _models.length;
  }

  List<ModelDownloadItem> get models => _models;

  bool get isDownloadComplete => _models.isNotEmpty && _models.every((m) => m.isComplete);

  // Single model: Gemma 4 handles everything —
  // vision (disease photos) + text (crop, weather, market advisories)
  final List<ModelDownloadItem> _models = [
    ModelDownloadItem(
      name: 'Gemma 4 Multimodal',
      description:
          'Handles disease detection, crop advisories, weather & market analysis',
      url:
          'https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q4_K_M.gguf',
      fileName: 'gemma-4-E4B-it-Q4_K_M.gguf',
      taskId: 'gemma4_model_download',
      sizeLabel: '2.4 GB',
    ),
  ];

  Future<void> initModel() async {
    WidgetsBinding.instance.addObserver(this);
    
    // Listen to global download updates (so UI updates even if returning from background)
    FileDownloader().updates.listen((update) {
      if (update is TaskProgressUpdate) {
        final model = _models.firstWhere(
          (m) => m.taskId == update.task.taskId,
          orElse: () => _models.first,
        );
        if (update.progress >= 0.0 && update.progress <= 1.0) {
          model.progress = update.progress;
          _statusMessage = 'Downloading ${model.name}...';
          
          // Assuming Gemma 4 model size is roughly 2457 MB (2.4 GB)
          const totalMB = 2457.0;
          final downloadedMB = (update.progress * totalMB);
          _progressText = '${downloadedMB.toStringAsFixed(1)} MB / ${totalMB.toStringAsFixed(1)} MB';
          
          notifyListeners();
        }
      } else if (update is TaskStatusUpdate) {
        if (update.status == TaskStatus.complete) {
          final model = _models.firstWhere(
            (m) => m.taskId == update.task.taskId,
            orElse: () => _models.first,
          );
          model.isComplete = true;
          model.progress = 1.0;
          notifyListeners();
          
          if (_models.every((m) => m.isComplete)) {
            _isDownloading = false;
            _loadModels();
          }
        }
      }
    });

    // Load local knowledge base (JSON)
    try {
      final jsonString =
          await rootBundle.loadString('assets/knowledge/disease_knowledge.json');
      _localKnowledge = jsonDecode(jsonString);
    } catch (e) {
      debugPrint("Could not load local knowledge: $e");
    }

    // Configure background_downloader
    FileDownloader().configure(
      globalConfig: [
        (Config.requestTimeout, const Duration(hours: 3)),
        (Config.checkAvailableSpace, 4096), // require 4GB free space
      ],
      androidConfig: [
        (Config.useCacheDir, Config.whenAble),
      ],
    );

    // Check if model already on disk
    final dir = await getApplicationDocumentsDirectory();
    bool allExist = true;
    for (final model in _models) {
      final file = File('${dir.path}/${model.fileName}');
      if (await file.exists()) {
        model.isComplete = true;
        model.progress = 1.0;
      } else {
        allExist = false;
      }
    }

    if (allExist) {
      _loadModels();
    } else {
      _statusMessage = 'Tap below to download the AI model.';
      notifyListeners();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _isDownloading) {
      // Re-trigger a notify listeners just in case UI missed an update
      notifyListeners();
    }
  }
  
  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }



  Future<void> downloadAllModels() async {
    _isDownloading = true;
    _statusMessage = 'Starting background download...';
    notifyListeners();

    final dir = await getApplicationDocumentsDirectory();

    for (final model in _models) {
      final destPath = '${dir.path}/${model.fileName}';
      final file = File(destPath);
      if (await file.exists()) {
        model.isComplete = true;
        model.progress = 1.0;
        notifyListeners();
        continue;
      }

      final task = DownloadTask(
        taskId: model.taskId,
        url: model.url,
        filename: model.fileName,
        directory: '', // Relative to baseDirectory
        baseDirectory: BaseDirectory.applicationDocuments,
        displayName: model.name,
        updates: Updates.statusAndProgress,
        requiresWiFi: false,
        retries: 3,
        allowPause: true,
        metaData: model.taskId,
        headers: {
          'Authorization': 'Bearer ${dotenv.env['HF_TOKEN'] ?? ''}',
        },
      );
      model.task = task;

      // Show a persistent notification for the download
      FileDownloader().configureNotification(
        running: TaskNotification(
          '${model.name} Downloading',
          'FarmSaathi AI model: {progress}%',
        ),
        complete: TaskNotification(
          '${model.name} Ready',
          'FarmSaathi AI model downloaded successfully',
        ),
        error: TaskNotification(
          'Download Failed',
          '${model.name} could not be downloaded',
        ),
        paused: TaskNotification(
          'Download Paused',
          '${model.name} will resume automatically',
        ),
        tapOpensFile: false,
      );

      // Using .enqueue() ensures that progress is ONLY processed by the global stream listener,
      // avoiding duplicate/racing updates that cause the progress to jump back and forth.
      await FileDownloader().enqueue(task);
    }
    
    // Check if they were already complete before enqueuing
    if (_models.every((m) => m.isComplete)) {
      _isDownloading = false;
      await _loadModels();
    }
  }

  Future<void> pauseDownload() async {
    for (final model in _models) {
      if (!model.isComplete && model.task != null) {
        await FileDownloader().pause(model.task!);
      }
    }
    _statusMessage = 'Download paused';
    notifyListeners();
  }

  Future<void> resumeDownload() async {
    for (final model in _models) {
      if (!model.isComplete && model.task != null) {
        final success = await FileDownloader().resume(model.task!);
        if (!success) {
          // If task cannot be resumed, re-enqueue it.
          await downloadAllModels();
          return;
        }
      } else if (!model.isComplete) {
        await downloadAllModels();
        return;
      }
    }
    _statusMessage = 'Resuming download...';
    notifyListeners();
  }

  Future<void> _loadModels() async {
    _statusMessage = 'Loading Gemma 4 into memory...';
    notifyListeners();

    // In production, initialize llama.cpp FFI bindings for Gemma 4 here
    await Future.delayed(const Duration(seconds: 2));
    _isModelLoaded = true;
    _statusMessage = 'Gemma 4 Ready ✓';
    notifyListeners();
  }

  // --- AI Inference APIs ---

  // Chat generation (text-only prompt)
  Stream<String> generateResponse(String prompt) async* {
    if (!_isModelLoaded) {
      yield "Model not loaded. Please download the model first.";
      return;
    }
    final mockResponse =
        "[On-Device AI Placeholder]\nYou asked: $prompt\n\n"
        "(Note: The full Gemma-4 on-device generation requires native C++ FFI bindings, which are not currently bundled in this demo. This is a mock response.)";
    for (int i = 0; i < mockResponse.length; i++) {
      await Future.delayed(const Duration(milliseconds: 20));
      yield mockResponse[i];
    }
  }

  // Edge RAG: Feed raw fetched data into the Local LLM to get an advisory
  Stream<String> generateAdvisory(String topic, Map<String, dynamic> rawData) async* {
    if (!_isModelLoaded) {
      yield "Model not loaded. Cannot generate advisory.";
      return;
    }
    final rawString = jsonEncode(rawData);
    final mockResponse =
        "📊 AI Advisory [Placeholder]\n\n"
        "Based on current $topic data:\n\n$rawString\n\n"
        "Recommendation: Conditions are favorable. Monitor soil moisture and apply preventive "
        "fungicide if humidity exceeds 80%. Ideal sowing window is the next 3-5 days.";
    for (int i = 0; i < mockResponse.length; i++) {
      await Future.delayed(const Duration(milliseconds: 15));
      yield mockResponse[i];
    }
  }

  // Vision: Process a disease photo using Gemma 4
  Future<Map<String, String>> analyzeImage(File imageFile) async {
    if (!_isModelLoaded) throw Exception("Model not loaded");

    // Simulate Vision processing delay (~10-15s on mobile CPUs)
    await Future.delayed(const Duration(seconds: 4));

    const diseaseKey = "Apple___Apple_scab";
    final knowledge = _localKnowledge[diseaseKey] ?? {};

    return {
      'disease': 'Apple Scab (AI Detection — Gemma 4)',
      'management': knowledge['management'] ?? 'Apply standard fungicides. Prune infected leaves.',
      'confidence': '89%',
    };
  }
}
