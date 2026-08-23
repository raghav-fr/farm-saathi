import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';

import '../../services/api_service.dart';
import '../../services/local_ai_service.dart';

class WeatherScreen extends StatefulWidget {
  const WeatherScreen({super.key});

  @override
  State<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends State<WeatherScreen> {
  bool _isLoading = false;
  Map<String, dynamic>? _weatherData;
  String _advisory = "";
  bool _isGeneratingAdvisory = false;

  Future<void> _fetchWeatherAndAnalyze() async {
    setState(() {
      _isLoading = true;
      _advisory = "";
    });

    try {
      // 1. Get Location
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception("Location permissions are denied");
        }
      }

      final position = await Geolocator.getCurrentPosition();
      
      // 2. Fetch raw data from API
      if (!mounted) return;
      final api = context.read<ApiService>();
      final weatherData = await api.getCurrentWeather(position.latitude, position.longitude);
      
      setState(() {
        _weatherData = weatherData;
        _isLoading = false;
        _isGeneratingAdvisory = true;
      });

      // 3. Edge RAG: Generate Local Advisory
      if (!mounted) return;
      final aiService = context.read<LocalAIService>();
      final stream = aiService.generateAdvisory("Weather", weatherData);
      
      await for (final token in stream) {
        if (!mounted) return;
        setState(() {
          _advisory += token;
        });
      }
      
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isGeneratingAdvisory = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Weather & Advisory'), backgroundColor: Colors.transparent, elevation: 0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.all(16),
              ),
              onPressed: _isLoading || _isGeneratingAdvisory ? null : _fetchWeatherAndAnalyze,
              icon: _isLoading 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                  : const Icon(Icons.location_on),
              label: const Text('Get Local Weather Analysis', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            
            const SizedBox(height: 32),
            
            if (_weatherData != null) ...[
              const Text('Raw Weather Data', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(_weatherData.toString(), style: const TextStyle(fontFamily: 'monospace')),
              ),
              
              const SizedBox(height: 24),
              const Text('AI Advisory', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green),
                ),
                child: Text(
                  _advisory.isEmpty ? "Analyzing weather patterns locally..." : _advisory,
                  style: const TextStyle(fontSize: 16, height: 1.5),
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
