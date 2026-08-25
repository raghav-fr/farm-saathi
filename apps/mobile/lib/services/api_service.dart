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
    // 1. Fetch Reverse Geocoding for City Name using Nominatim
    String cityName = "Unknown Location";
    try {
      final geoResponse = await Dio().get(
        'https://nominatim.openstreetmap.org/reverse',
        queryParameters: {
          'lat': lat,
          'lon': lon,
          'format': 'json',
        },
        options: Options(
          headers: {
            'User-Agent': 'FarmSaathi/1.0 (contact@farmsaathi.com)', // Required by Nominatim
            'Accept-Language': language,
          },
        ),
      );
      if (geoResponse.data != null) {
        final address = geoResponse.data['address'];
        if (address != null) {
          String city = address['city'] ?? 
                     address['town'] ?? 
                     address['village'] ?? 
                     address['suburb'] ??
                     address['municipality'] ??
                     "Unknown Location";
          
          String district = address['state_district'] ?? 
                            address['county'] ?? 
                            address['district'] ?? 
                            "";
          
          if (district.isNotEmpty && district != city) {
            cityName = '$city, $district';
          } else {
            cityName = city;
          }
        }
      }
    } catch (e) {
      print("Geocoding error: $e");
    }

    // 2. Fetch Open-Meteo Weather
    final response = await Dio().get(
      'https://api.open-meteo.com/v1/forecast',
      queryParameters: {
        'latitude': lat,
        'longitude': lon,
        'current': 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day',
        'daily': 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max',
        'timezone': 'auto'
      },
    );
    
    final data = response.data;
    final current = data['current'];

    // Map WMO Weather code to text
    String getConditionText(int code) {
      if (code == 0) return "Clear sky";
      if (code == 1) return "Mainly clear";
      if (code == 2) return "Partly cloudy";
      if (code == 3) return "Overcast";
      if (code == 45 || code == 48) return "Fog";
      if (code >= 51 && code <= 55) return "Drizzle";
      if (code >= 61 && code <= 65) return "Rain";
      if (code >= 71 && code <= 75) return "Snow";
      if (code >= 80 && code <= 82) return "Rain showers";
      if (code >= 95) return "Thunderstorm";
      return "Unknown";
    }

    return {
      'location': {
        'name': cityName,
        'lat': lat,
        'lon': lon,
      },
      'current': {
        'temperature_c': current['temperature_2m'],
        'humidity_pct': current['relative_humidity_2m'],
        'condition': getConditionText(current['weather_code']),
        'wind_kph': current['wind_speed_10m'],
        'feels_like_c': current['apparent_temperature'],
        'rainfall_mm': current['precipitation'],
      },
      'daily': data['daily'],
      'raw_data': data
    };
  }

  // --- Market ---
  Future<Map<String, dynamic>> getMarketRates({String? state, String? district, String? commodity}) async {
    final query = <String, dynamic>{};
    if (state != null && state.isNotEmpty) query['state'] = state;
    if (district != null && district.isNotEmpty) query['district'] = district;
    if (commodity != null && commodity.isNotEmpty) query['commodity'] = commodity;
    
    final response = await _dio.get('/market/rates', queryParameters: query);
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

  // --- AI Chat ---
  Future<Map<String, dynamic>> postChat({
    required String message,
    String? conversationId,
    String? farmId,
    String language = 'en',
    String? imageBase64,
  }) async {
    final response = await _dio.post('/chat', data: {
      'message': message,
      if (conversationId != null) 'conversation_id': conversationId,
      if (farmId != null) 'farm_id': farmId,
      'language': language,
      if (imageBase64 != null) 'image': imageBase64,
    });
    return response.data;
  }

  // --- AI Disease Detection ---
  Future<Map<String, dynamic>> predictDisease({
    required String imagePath,
    String? farmId,
    String? cropName,
    String language = 'en',
  }) async {
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(imagePath),
      if (farmId != null) 'farm_id': farmId,
      if (cropName != null) 'crop_name': cropName,
      'language': language,
    });
    final response = await _dio.post('/disease/predict', data: formData);
    return response.data;
  }
}
