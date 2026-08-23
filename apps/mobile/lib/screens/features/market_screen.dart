import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/api_service.dart';
import '../../services/local_ai_service.dart';
import '../../theme/app_theme.dart';

class MarketScreen extends StatefulWidget {
  const MarketScreen({super.key});

  @override
  State<MarketScreen> createState() => _MarketScreenState();
}

class _MarketScreenState extends State<MarketScreen> {
  final _stateCtrl = TextEditingController(text: 'Maharashtra');
  final _commodityCtrl = TextEditingController(text: 'Onion');
  bool _isLoading = false;
  List<dynamic> _prices = [];
  String _advisory = "";
  bool _isGeneratingAdvisory = false;

  @override
  void initState() {
    super.initState();
    _fetchPrices();
  }

  Future<void> _fetchPrices() async {
    setState(() {
      _isLoading = true;
      _advisory = "";
    });

    try {
      final api = context.read<ApiService>();
      final data = await api.getMarketRates(state: _stateCtrl.text, commodity: _commodityCtrl.text);
      
      setState(() {
        _prices = data['data'] ?? [];
        _isLoading = false;
      });

      // Edge RAG logic
      if (!mounted) return;
      setState(() {
        _isGeneratingAdvisory = true;
      });

      final aiService = context.read<LocalAIService>();
      final stream = aiService.generateAdvisory("Market Analysis for ${_commodityCtrl.text}", {'prices': data});
      
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _stateCtrl,
                  style: Theme.of(context).textTheme.bodyLarge,
                  decoration: InputDecoration(
                    labelText: 'State',
                    labelStyle: Theme.of(context).textTheme.bodyMedium,
                    filled: true,
                    fillColor: AppTheme.bgCard,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.black12)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.black12)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _commodityCtrl,
                  style: Theme.of(context).textTheme.bodyLarge,
                  decoration: InputDecoration(
                    labelText: 'Commodity',
                    labelStyle: Theme.of(context).textTheme.bodyMedium,
                    filled: true,
                    fillColor: AppTheme.bgCard,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.black12)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.black12)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 56,
                child: IconButton(
                  onPressed: _isLoading || _isGeneratingAdvisory ? null : _fetchPrices,
                  icon: const Icon(Icons.search),
                  style: IconButton.styleFrom(
                    backgroundColor: AppTheme.brand500,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ),
        
        if (_advisory.isNotEmpty || _isGeneratingAdvisory)
          GlassCard(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('AI Market Analysis', style: TextStyle(color: AppTheme.brand800, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(
                  _advisory.isEmpty ? "Analyzing market trends locally..." : _advisory,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textPrimary),
                ),
              ],
            ),
          ),
        
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _prices.length,
                  itemBuilder: (context, index) {
                    final item = _prices[index];
                    return GlassCard(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: EdgeInsets.zero,
                      child: ListTile(
                        title: Text('${item['market']}', style: Theme.of(context).textTheme.titleMedium),
                        subtitle: Text('Arrival Date: ${item['arrival_date']}', style: Theme.of(context).textTheme.bodySmall),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '₹${item['modal_price']}',
                              style: const TextStyle(color: AppTheme.brand500, fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            Text('per quintal', style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
