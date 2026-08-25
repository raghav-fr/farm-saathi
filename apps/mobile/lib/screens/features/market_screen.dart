import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';

import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class MarketScreen extends StatefulWidget {
  const MarketScreen({super.key});

  @override
  State<MarketScreen> createState() => _MarketScreenState();
}

class _MarketScreenState extends State<MarketScreen> {
  final _stateCtrl = TextEditingController();
  final _districtCtrl = TextEditingController();
  final _commodityCtrl = TextEditingController();
  bool _isLoading = false;
  bool _isCachedData = false;
  List<dynamic> _prices = [];

  @override
  void initState() {
    super.initState();
    _initLocationAndFetch();
  }

  Future<void> _initLocationAndFetch() async {
    setState(() => _isLoading = true);
    
    try {
      final loc = await Geolocator.getCurrentPosition();
      final uri = Uri.parse('https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}&zoom=10&addressdetails=1');
      final res = await http.get(uri, headers: {'User-Agent': 'FarmSaathi/1.0'});
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final address = data['address'] as Map<String, dynamic>;
        
        final state = address['state'] ?? '';
        final district = address['state_district'] ?? address['county'] ?? address['city'] ?? '';
        
        _stateCtrl.text = state;
        _districtCtrl.text = district.replaceAll(' District', '');
      }
    } catch (e) {
      debugPrint('Location error: $e');
    }
    
    await _fetchPrices();
  }

  Future<void> _fetchPrices() async {
    setState(() {
      _isLoading = true;
      _isCachedData = false;
    });

    final prefs = await SharedPreferences.getInstance();
    final cacheKey = 'market_rates_${_stateCtrl.text}_${_districtCtrl.text}_${_commodityCtrl.text}';

    try {
      final api = context.read<ApiService>();
      final data = await api.getMarketRates(state: _stateCtrl.text, district: _districtCtrl.text, commodity: _commodityCtrl.text);
      
      setState(() {
        _prices = data['data'] ?? data['records'] ?? [];
        _isLoading = false;
      });

      await prefs.setString(cacheKey, jsonEncode(_prices));

    } catch (e) {
      // Try offline cache
      final cachedStr = prefs.getString(cacheKey);
      if (cachedStr != null) {
        setState(() {
          _prices = jsonDecode(cachedStr);
          _isCachedData = true;
          _isLoading = false;
        });
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Showing offline cached rates.')));
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error fetching rates: $e')));
        setState(() => _isLoading = false);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Market Prices', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (_isCachedData)
            Container(
              margin: const EdgeInsets.only(right: 16),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange.withValues(alpha: 0.5)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.offline_bolt, size: 14, color: Colors.orange),
                  SizedBox(width: 4),
                  Text('Cached', style: TextStyle(fontSize: 10, color: Colors.orange, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4)),
                ],
                border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _commodityCtrl,
                          style: theme.textTheme.bodyMedium,
                          decoration: InputDecoration(
                            hintText: 'Search commodity...',
                            prefixIcon: const Icon(Icons.search, size: 20),
                            isDense: true,
                            filled: true,
                            fillColor: AppTheme.bgCard,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: _isLoading ? null : _fetchPrices,
                        icon: _isLoading 
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.refresh),
                        style: IconButton.styleFrom(
                          backgroundColor: AppTheme.brand500,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.all(12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _stateCtrl,
                          style: theme.textTheme.bodySmall,
                          decoration: InputDecoration(
                            hintText: 'State',
                            prefixIcon: const Icon(Icons.map, size: 16),
                            isDense: true,
                            filled: true,
                            fillColor: AppTheme.bgCard,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _districtCtrl,
                          style: theme.textTheme.bodySmall,
                          decoration: InputDecoration(
                            hintText: 'District',
                            prefixIcon: const Icon(Icons.location_city, size: 16),
                            isDense: true,
                            filled: true,
                            fillColor: AppTheme.bgCard,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

        
        Expanded(
          child: _isLoading && _prices.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : _prices.isEmpty 
                  ? const Center(child: Text("No market rates found", style: TextStyle(color: Colors.black54, fontWeight: FontWeight.bold)))
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: _prices.length,
                      itemBuilder: (context, index) {
                        final item = _prices[index];
                        final commodity = item['commodity'] ?? 'Unknown';
                        final variety = item['variety'] ?? 'Common';
                        final modalPrice = item['modal_price'] ?? '0';
                        final minPrice = item['min_price'] ?? '0';
                        final maxPrice = item['max_price'] ?? '0';
                        final market = item['market'] ?? 'Unknown Market';
                        final district = item['district'] ?? '';
                        final state = item['state'] ?? '';
                        final arrivalDate = item['arrival_date'] ?? '';

                        final double modalPriceNum = double.tryParse(modalPrice.toString()) ?? 0;
                        final String perKgPrice = (modalPriceNum / 100).toStringAsFixed(1);

                        return Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.03),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                            border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          commodity,
                                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppTheme.textPrimary),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          variety.toString().toUpperCase(),
                                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.2, color: AppTheme.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Row(
                                        crossAxisAlignment: CrossAxisAlignment.baseline,
                                        textBaseline: TextBaseline.alphabetic,
                                        children: [
                                          Text(
                                            '₹$modalPrice',
                                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 24, color: AppTheme.brand600),
                                          ),
                                          const SizedBox(width: 4),
                                          const Text(
                                            '/ Qtl',
                                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.textSecondary),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '~ ₹$perKgPrice / kg',
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: AppTheme.brand500.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('Min: ₹$minPrice', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.brand700)),
                                    Text('|', style: TextStyle(fontSize: 11, color: AppTheme.brand700.withValues(alpha: 0.4))),
                                    Text('Max: ₹$maxPrice', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.brand700)),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              Divider(color: Colors.black.withValues(alpha: 0.05)),
                              const SizedBox(height: 12),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: Colors.green.shade50,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(Icons.location_on, size: 14, color: AppTheme.brand600),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(market, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                                        const SizedBox(height: 2),
                                        Text('$district, $state'.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 0.5)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  const Icon(Icons.access_time, size: 12, color: AppTheme.textSecondary),
                                  const SizedBox(width: 4),
                                  Text('Reported: $arrivalDate', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textSecondary)),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
        ),
      ],
    ),
    );
  }
}
