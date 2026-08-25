import 'dart:ui';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../services/local_ai_service.dart';
import '../services/api_service.dart';
import '../services/firestore_service.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';
import 'chat_screen.dart';
import '../theme/app_theme.dart';

import 'package:geolocator/geolocator.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isLoading = true;
  bool _isCachedData = false;
  Map<String, dynamic>? _weather;
  List<dynamic>? _farms;
  List<dynamic> _alerts = [];
  Position? _lastWeatherPosition;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LocalAIService>().initModel();
      final loc = context.read<LocationService>();
      loc.addListener(_onLocationChanged);
      loc.startLiveTracking();
      _fetchDashboardData();
    });
  }

  void _onLocationChanged() {
    final loc = context.read<LocationService>();
    final pos = loc.currentPosition;
    if (pos == null) return;

    // If it's the first time we get a location, or we've moved > 2km, refresh weather
    if (_lastWeatherPosition == null || 
        Geolocator.distanceBetween(_lastWeatherPosition!.latitude, _lastWeatherPosition!.longitude, pos.latitude, pos.longitude) > 2000) {
      _lastWeatherPosition = pos;
      _fetchDashboardData();
    }
  }

  @override
  void dispose() {
    // Note: To be safe, we don't strictly need to remove listener here since LocationService is global, 
    // but in a real app we might want to unregister if HomeScreen is destroyed.
    super.dispose();
  }

  Future<void> _fetchDashboardData() async {
    setState(() => _isLoading = true);

    final api = context.read<ApiService>();
    final loc = context.read<LocationService>();
    final prefs = await SharedPreferences.getInstance();
    
    // Only fetch live weather if we have a real location, otherwise rely purely on cache
    Map<String, dynamic>? weatherData;
    bool isCached = false;
    if (loc.currentPosition != null) {
      double lat = loc.currentPosition!.latitude;
      double lon = loc.currentPosition!.longitude;
      
      try {
        weatherData = await api.getCurrentWeather(lat, lon);
        
        // Preserve old location name if Nominatim fails during pull-to-refresh
        if (weatherData['location'] != null && 
            weatherData['location']['name'] == 'Unknown Location' && 
            _weather != null && 
            _weather!['location']?['name'] != null && 
            _weather!['location']?['name'] != 'Unknown Location') {
          weatherData['location']['name'] = _weather!['location']['name'];
        }
        
        await prefs.setString('cached_weather', jsonEncode(weatherData));
      } catch (e) {
        debugPrint('Weather fetch failed (likely offline): $e');
        isCached = true;
        final cached = prefs.getString('cached_weather');
        if (cached != null) {
          weatherData = jsonDecode(cached);
        }
      }
    } else {
      isCached = true;
      final cached = prefs.getString('cached_weather');
      if (cached != null) {
        weatherData = jsonDecode(cached);
      }
    }
    
    List<dynamic> farmsData = [];
    try {
      final firestore = context.read<FirestoreService>();
      farmsData = await firestore.getFarmsOnce();
    } catch (e) {
      debugPrint('Farms fetch failed: $e');
    }

    List<dynamic> alertsData = [];
    try {
      alertsData = await api.getAlerts(unreadOnly: true);
      await prefs.setString('cached_alerts', jsonEncode(alertsData));
    } catch (e) {
      debugPrint('Alerts fetch failed (likely offline): $e');
      final cached = prefs.getString('cached_alerts');
      if (cached != null) {
        alertsData = jsonDecode(cached);
      }
    }

    if (mounted) {
      setState(() {
        _weather = weatherData;
        _farms = farmsData;
        _alerts = alertsData;
        _isCachedData = isCached;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final userName = authService.farmerProfile?['name'] ?? authService.currentUser?.displayName ?? 'Farmer';
    final loc = context.watch<LocationService>();
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchDashboardData,
          color: theme.colorScheme.primary,
          child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Hello, $userName',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        if (_alerts.isNotEmpty)
                          GestureDetector(
                            onTap: () => context.push('/alerts'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.red.shade50,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.notifications_active, size: 14, color: Colors.red.shade700),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${_alerts.length} Alerts',
                                    style: TextStyle(color: Colors.red.shade700, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          loc.error != null ? Icons.location_off_outlined : Icons.location_on_outlined, 
                          size: 14, 
                          color: loc.error != null ? Colors.red.shade700 : Colors.green.shade700
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            loc.error != null 
                                ? loc.error! 
                                : _weather?['location']?['name'] ?? 'Fetching location...',
                            style: TextStyle(
                              fontSize: 14, 
                              color: loc.error != null ? Colors.red.shade800 : Colors.green.shade800
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (_weather != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: _isCachedData ? Colors.orange.shade50 : Colors.green.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                Icon(_isCachedData ? Icons.cloud_off : Icons.cloud_sync, size: 10, color: _isCachedData ? Colors.orange.shade700 : Colors.green.shade700),
                                const SizedBox(width: 2),
                                Text(_isCachedData ? 'Cached' : 'Live', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _isCachedData ? Colors.orange.shade700 : Colors.green.shade700)),
                              ],
                            ),
                          ),
                        const SizedBox(width: 8),
                        if (loc.error != null)
                          InkWell(
                            onTap: () async {
                              final permission = await Geolocator.checkPermission();
                              if (permission == LocationPermission.deniedForever) {
                                await Geolocator.openAppSettings();
                              } else {
                                loc.startLiveTracking();
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.red.shade100,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                'Enable',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.red.shade900,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    _buildWeatherHeader(),
                    const SizedBox(height: 24),
                    _buildWeatherGrid(),
                    const SizedBox(height: 32),
                    Text(
                      'Quick Actions',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildQuickActions(),
                    const SizedBox(height: 32),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Active Fields', style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppTheme.textPrimary)),
                        TextButton(
                          onPressed: () => context.push('/farms'),
                          child: const Text('View All', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _buildMyFieldsCard(),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildWeatherHeader() {
    final current = _weather?['current'];
    final raw = _weather?['raw_data']?['current'];
    final weatherCode = raw?['weather_code'] ?? 0;
    final isDay = raw?['is_day'] ?? 1;

    final temp = current != null ? current['temperature_c'].round().toString() : '--';
    final condition = current != null ? current['condition'] : 'Loading';
    
    IconData weatherIcon = Icons.wb_sunny;
    Color iconColor = Colors.yellow.shade600;

    if (weatherCode == 0 || weatherCode == 1) {
      weatherIcon = isDay == 1 ? Icons.wb_sunny : Icons.nights_stay;
      iconColor = isDay == 1 ? Colors.yellow.shade600 : Colors.indigo.shade300;
    } else if (weatherCode == 2) {
      weatherIcon = isDay == 1 ? Icons.wb_twilight : Icons.nights_stay;
      iconColor = isDay == 1 ? Colors.orange.shade300 : Colors.indigo.shade200;
    } else if (weatherCode == 3) {
      weatherIcon = Icons.wb_cloudy;
      iconColor = Colors.grey.shade400;
    } else if (weatherCode == 45 || weatherCode == 48) {
      weatherIcon = Icons.foggy;
      iconColor = Colors.grey.shade400;
    } else if (weatherCode >= 51 && weatherCode <= 67) {
      weatherIcon = Icons.water_drop;
      iconColor = Colors.blue.shade400;
    } else if (weatherCode >= 71 && weatherCode <= 77) {
      weatherIcon = Icons.ac_unit;
      iconColor = Colors.lightBlue.shade200;
    } else if (weatherCode >= 80 && weatherCode <= 82) {
      weatherIcon = Icons.cloudy_snowing;
      iconColor = Colors.blue.shade600;
    } else if (weatherCode >= 95) {
      weatherIcon = Icons.thunderstorm;
      iconColor = Colors.deepPurple.shade400;
    }

    return GlassCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$temp°',
                style: const TextStyle(fontSize: 64, fontWeight: FontWeight.w600, height: 1, color: Color(0xFF0D1F0F)),
              ),
              Icon(weatherIcon, size: 120, color: iconColor),
            ],
          ),
          const SizedBox(height: 24),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              condition,
              style: TextStyle(fontSize: 14, height: 1.4, color: Colors.green.shade700, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWeatherGrid() {
    final current = _weather?['current'];
    final humidity = current != null ? '${current['humidity_pct']}%' : '--%';
    final wind = current != null ? '${current['wind_kph']} km/h' : '-- km/h';
    final rain = current != null ? '${current['rainfall_mm']} mm' : '-- mm';

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 2.5,
      children: [
        _buildMetricCard(Icons.thermostat_outlined, 'Feels Like', current != null ? '${current['feels_like_c']}°C' : '--'),
        _buildMetricCard(Icons.water_drop_outlined, 'Humidity', humidity),
        _buildMetricCard(Icons.air_outlined, 'Wind', wind),
        _buildMetricCard(Icons.cloudy_snowing, 'Rainfall', rain),
      ],
    );
  }

  Widget _buildMetricCard(IconData icon, String label, String value) {
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.green.shade700, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54), overflow: TextOverflow.ellipsis),
                Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0D1F0F)), overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    final items = [
      {'icon': Icons.grass, 'label': 'Add Crop'},
      {'icon': Icons.document_scanner, 'label': 'Scan'},
      {'icon': Icons.map, 'label': 'Map'},
      {'icon': Icons.analytics, 'label': 'Report'},
    ];

    return SizedBox(
      height: 90,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(width: 16),
        itemBuilder: (context, index) {
          return Column(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.green.shade100),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    )
                  ]
                ),
                child: Icon(items[index]['icon'] as IconData, color: Colors.green.shade700),
              ),
              const SizedBox(height: 8),
              Text(
                items[index]['label'] as String,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildMyFieldsCard() {
    if (_farms == null || _farms!.isEmpty) {
      return const GlassCard(
        padding: EdgeInsets.all(24),
        child: Center(
          child: Text('No farms added yet.', style: TextStyle(color: Colors.black54)),
        ),
      );
    }

    final farm = _farms![0];

    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.green.shade100,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.eco, color: Colors.green.shade700),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(farm['name'] ?? 'My Farm', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text('${farm['area_hectares'] ?? 0} Hectares', style: const TextStyle(color: Colors.black54, fontSize: 12)),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Active',
                    style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          Container(
            height: 120,
            width: double.infinity,
            margin: const EdgeInsets.only(left: 12, right: 12, bottom: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: Colors.green.shade50,
            ),
            child: Icon(Icons.landscape, size: 48, color: Colors.green.shade200),
          ),
        ],
      ),
    );
  }
}
