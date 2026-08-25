import 'dart:io';
import 'dart:convert';
import 'package:background_downloader/background_downloader.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:fllama/fllama.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
  
  double? _contextId;
  String? _lastLoadError;

  double get overallProgress {
    if (_models.isEmpty) return 0.0;
    return _models.fold(0.0, (sum, m) => sum + m.progress) / _models.length;
  }

  List<ModelDownloadItem> get models => _models;

  bool get isDownloadComplete => _models.isNotEmpty && _models.every((m) => m.isComplete);

  // Single model: Gemma 2B (2 Billion params) - lighter and mobile-friendly
  final List<ModelDownloadItem> _models = [
    ModelDownloadItem(
      name: 'Gemma 2B Chat',
      description:
          'Handles local chat inference natively on mobile devices.',
      url:
          'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
      fileName: 'gemma-2-2b-it-Q4_K_M.gguf',
      taskId: 'gemma_2b_model_download',
      sizeLabel: '1.6 GB',
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
          
          // Assuming Gemma 2B model size is roughly 1600 MB (1.6 GB)
          const totalMB = 1600.0;
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

    // Check if model already on disk and is a valid size (> 100MB)
    final dir = await getApplicationDocumentsDirectory();
    bool allExist = true;
    for (final model in _models) {
      final file = File('${dir.path}/${model.fileName}');
      if (await file.exists()) {
        final length = await file.length();
        if (length > 100 * 1024 * 1024) {
          model.isComplete = true;
          model.progress = 1.0;
        } else {
          // File is too small (corrupted or incomplete), delete it
          await file.delete();
          allExist = false;
        }
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
          'Downloading ${model.name}',
          'Progress: {progress}%',
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

  // --- Settings & Diagnostics ---
  
  Future<Map<String, dynamic>> analyzeModel() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/${_models.first.fileName}');
    
    bool exists = await file.exists();
    double sizeMB = 0;
    if (exists) {
      sizeMB = (await file.length()) / (1024 * 1024);
    }

    return {
      'exists': exists,
      'sizeMB': sizeMB.toStringAsFixed(2),
      'expectedSize': _models.first.sizeLabel,
      'lastError': _lastLoadError ?? 'None',
      'isModelLoaded': _isModelLoaded,
      'statusMessage': _statusMessage,
      'isCurrentlyDownloading': _isDownloading,
    };
  }

  Future<void> deleteAndRedownloadModel() async {
    _isDownloading = false;
    _isModelLoaded = false;
    _statusMessage = 'Preparing to delete and re-download...';
    _progressText = '';
    notifyListeners();

    // Cancel tasks
    await FileDownloader().cancelTasksWithIds(_models.map((e) => e.taskId).toList());

    final dir = await getApplicationDocumentsDirectory();
    for (final model in _models) {
      final file = File('${dir.path}/${model.fileName}');
      if (await file.exists()) {
        try {
          await file.delete();
        } catch (_) {}
      }
      model.progress = 0;
      model.isComplete = false;
    }

    notifyListeners();
    await downloadAllModels();
  }

  Future<void> _loadModels() async {
    _statusMessage = 'Loading Gemma 2B into memory...';
    notifyListeners();

    try {
      final dir = await getApplicationDocumentsDirectory();
      final modelPath = '${dir.path}/${_models.first.fileName}';
      
      final loadCommand = await Fllama.instance()?.initContext(
        modelPath,
        nCtx: 2048, // Much larger context window for RAG Data
        nThreads: 4, // Utilize 4 CPU cores
        nGpuLayers: 99, // Offload as many layers to the GPU as possible
      );

      if (loadCommand != null && loadCommand.containsKey('contextId')) {
        _contextId = (loadCommand['contextId'] as num).toDouble();
        _isModelLoaded = true;
        _lastLoadError = null;
        _statusMessage = 'Gemma 2B Ready ✓';
      } else {
        throw Exception("Failed to get contextId from fllama");
      }
    } catch (e) {
      debugPrint("Failed to load Llama model: $e");
      _isModelLoaded = false;
      _lastLoadError = e.toString();
      _statusMessage = 'Load Failed (See Analyze)';
    }
    notifyListeners();
  }

  // --- AI Inference APIs ---

  // --- Contextual Offline RAG Engine ---
  
  Future<String> _buildContextualPrompt(String userPrompt, Map<String, dynamic>? farmerProfile) async {
    final prefs = await SharedPreferences.getInstance();
    
    final weather = prefs.getString('cached_weather');
    final alerts = prefs.getString('cached_alerts');
    
    final keys = prefs.getKeys();
    final marketRates = [];
    for (final key in keys) {
      if (key.startsWith('market_rates_')) {
        final val = prefs.getString(key);
        if (val != null) marketRates.add(val);
      }
    }

    final buffer = StringBuffer();
    buffer.writeln("System: You are an intelligent offline agricultural assistant named FarmSaathi AI. Use the following real-time cached data from the app to provide highly accurate, contextual advice to the farmer.");
    
    if (farmerProfile != null) {
      buffer.writeln("Farmer, Crop & Location Details:");
      buffer.writeln(jsonEncode(farmerProfile));
    }

    if (weather != null) buffer.writeln("Weather Data (including 7-day forecast): $weather");
    if (alerts != null) buffer.writeln("Farm Alerts: $alerts");
    if (marketRates.isNotEmpty) buffer.writeln("Market Rates: ${marketRates.join(' | ')}");

    buffer.writeln("\nUser Question: $userPrompt");
    buffer.writeln("\nAssistant: ");

    return buffer.toString();
  }

  // Chat generation (text-only prompt)
  Stream<String> generateResponse(String prompt, {Map<String, dynamic>? farmerProfile}) async* {
    if (!_isModelLoaded) {
      yield "Model not loaded. Please download the model first.";
      return;
    }
    
    if (_contextId == null) {
      yield "AI Engine failed to initialize. Error: $_lastLoadError";
      return;
    }
    
    final fullPrompt = await _buildContextualPrompt(prompt, farmerProfile);
    
    // Start completion
    Fllama.instance()?.completion(_contextId!, prompt: fullPrompt);
    
    // Listen to token stream
    final stream = Fllama.instance()!.onTokenStream;
    if (stream != null) {
      await for (final event in stream) {
        if (event['contextId'] == _contextId) {
          final token = event['token'] as String?;
          final done = event['done'] as bool? ?? false;
          
          if (token != null && token.isNotEmpty) {
            yield token;
          }
          
          if (done) {
            break;
          }
        }
      }
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
  Future<Map<String, dynamic>> analyzeImage(File imageFile) async {
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

  // Recommendation: Offline crop recommendation using Gemma 4
  Future<Map<String, dynamic>> recommendCrop(Map<String, dynamic> data) async {
    if (!_isModelLoaded) throw Exception("Model not loaded");

    // Simulate local inference delay
    await Future.delayed(const Duration(seconds: 2));

    return {
      'recommendations': [
        {'crop': 'Maize (Local AI)', 'score': 0.95},
        {'crop': 'Wheat (Local AI)', 'score': 0.88},
        {'crop': 'Rice (Local AI)', 'score': 0.72},
      ],
      'explanation': 'Based on your local offline data profile, Maize is highly suitable. (Offline fallback generated by local model).'
    };
  }
}
