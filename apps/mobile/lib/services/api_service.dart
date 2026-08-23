import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../config.dart';

class ApiService {
  late final Dio _dio;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: Config.apiUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: { 'Content-Type': 'application/json' },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final user = FirebaseAuth.instance.currentUser;
        if (user != null) {
          final token = await user.getIdToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        // Handle global errors if needed
        return handler.next(error);
      }
    ));
  }

  // --- Weather ---
  Future<Map<String, dynamic>> getCurrentWeather(double lat, double lon, {String language = 'en', bool forceRefresh = false}) async {
    final response = await _dio.get('/weather/current', queryParameters: {
      'lat': lat,
      'lon': lon,
      'language': language,
      'forceRefresh': forceRefresh,
    });
    return response.data;
  }

  // --- Market ---
  Future<Map<String, dynamic>> getMarketRates({String? state, String? district, String? commodity}) async {
    final response = await _dio.get('/market/rates', queryParameters: {
      'state': ?state,
      'district': ?district,
      'commodity': ?commodity,
    });
    return response.data;
  }

  // --- News & Govt Schemes ---
  Future<Map<String, dynamic>> getNews({int page = 1, int limit = 15}) async {
    final response = await _dio.get('/news', queryParameters: {
      'page': page,
      'limit': limit,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> getInsights({bool forceRefresh = false}) async {
    final response = await _dio.get('/insights/daily', queryParameters: {
      'forceRefresh': forceRefresh,
    });
    return response.data;
  }

  // --- Farmer ---
  Future<Map<String, dynamic>> getMe() async {
    final response = await _dio.get('/farmers/me');
    return response.data;
  }

  Future<Map<String, dynamic>> updateMe(Map<String, dynamic> data) async {
    final response = await _dio.put('/farmers/me', data: data);
    return response.data;
  }

  Future<Map<String, dynamic>> onboard(Map<String, dynamic> data) async {
    final response = await _dio.post('/farmers/onboard', data: data);
    return response.data;
  }

  // --- Alerts ---
  Future<List<dynamic>> getAlerts({bool unreadOnly = false}) async {
    final response = await _dio.get('/alerts', queryParameters: {'unread_only': unreadOnly});
    return response.data as List<dynamic>;
  }

  Future<void> markAlertRead(String alertId) async {
    await _dio.put('/alerts/$alertId/read');
  }

  Future<void> markAllAlertsRead() async {
    await _dio.put('/alerts/read-all');
  }

  Future<void> deleteAlert(String alertId) async {
    await _dio.delete('/alerts/$alertId');
  }

  // --- Farms ---
  Future<List<dynamic>> getFarms() async {
    final response = await _dio.get('/farms');
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getFarm(String id) async {
    final response = await _dio.get('/farms/$id');
    return response.data;
  }

  Future<Map<String, dynamic>> createFarm(Map<String, dynamic> data) async {
    final response = await _dio.post('/farms', data: data);
    return response.data;
  }

  Future<Map<String, dynamic>> updateFarm(String id, Map<String, dynamic> data) async {
    final response = await _dio.put('/farms/$id', data: data);
    return response.data;
  }

  Future<void> deleteFarm(String id) async {
    await _dio.delete('/farms/$id');
  }

  Future<Map<String, dynamic>> addSoilTest(String farmId, Map<String, dynamic> data) async {
    final response = await _dio.post('/farms/$farmId/soil-test', data: data);
    return response.data;
  }

  Future<Map<String, dynamic>> getLatestSoilTest(String farmId) async {
    final response = await _dio.get('/farms/$farmId/soil-test/latest');
    return response.data;
  }

  // --- Crops ---
  Future<List<dynamic>> getCrops(String farmId) async {
    final response = await _dio.get('/crops/farms/$farmId/crops');
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> addCrop(String farmId, Map<String, dynamic> data) async {
    final response = await _dio.post('/crops/farms/$farmId/crops', data: data);
    return response.data;
  }

  Future<Map<String, dynamic>> updateCrop(String farmId, String cropId, Map<String, dynamic> data) async {
    final response = await _dio.put('/crops/farms/$farmId/crops/$cropId', data: data);
    return response.data;
  }

  Future<void> deleteCrop(String farmId, String cropId) async {
    await _dio.delete('/crops/farms/$farmId/crops/$cropId');
  }

  Future<Map<String, dynamic>> recommendCrop(Map<String, dynamic> data) async {
    final response = await _dio.post('/crops/recommend', data: data);
    return response.data;
  }
}
