import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../services/local_ai_service.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';
import 'chat_screen.dart';
import '../theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _weather;
  List<dynamic>? _farms;
  List<dynamic> _alerts = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LocalAIService>().initModel();
      _fetchDashboardData();
    });
  }

  Future<void> _fetchDashboardData() async {
    setState(() => _isLoading = true);
    try {
      final loc = context.read<LocationService>();
      await loc.getCurrentPosition();

      final api = context.read<ApiService>();
      
      // Default to New Delhi if location fails for demo
      double lat = loc.currentPosition?.latitude ?? 28.6139;
      double lon = loc.currentPosition?.longitude ?? 77.2090;

      final weatherData = await api.getCurrentWeather(lat, lon);
      
      List<dynamic> farmsData = [];
      try {
        farmsData = await api.getFarms();
      } catch (e) {
        // Fallback if farms API fails
        farmsData = [];
      }

      List<dynamic> alertsData = [];
      try {
        alertsData = await api.getAlerts(unreadOnly: true);
      } catch (e) {
        alertsData = [];
      }

      setState(() {
        _weather = weatherData;
        _farms = farmsData;
        _alerts = alertsData;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching dashboard data: $e');
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final userName = authService.farmerProfile?['name'] ?? authService.currentUser?.displayName ?? 'Farmer';
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchDashboardData,
          color: theme.colorScheme.primary,
          child: _isLoading 
              ? const Center(child: CircularProgressIndicator()) 
              : ListView(
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
                        Icon(Icons.location_on_outlined, size: 14, color: Colors.green.shade700),
                        const SizedBox(width: 4),
                        Text(
                          _weather?['location']?['name'] ?? 'Fetching location...',
                          style: TextStyle(fontSize: 14, color: Colors.green.shade800),
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
    final temp = current != null ? current['temperature_c'].round().toString() : '--';
    final condition = current != null ? current['condition'] : 'Loading';
    
    return GlassCard(
      padding: const EdgeInsets.all(24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$temp°',
                style: const TextStyle(fontSize: 64, fontWeight: FontWeight.w600, height: 1, color: Color(0xFF0D1F0F)),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  condition,
                  style: TextStyle(fontSize: 14, color: Colors.green.shade700, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
          Icon(Icons.wb_sunny, size: 72, color: Colors.yellow.shade600),
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
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
              Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0D1F0F))),
            ],
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
