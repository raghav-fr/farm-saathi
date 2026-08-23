import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class FarmsScreen extends StatefulWidget {
  const FarmsScreen({super.key});

  @override
  State<FarmsScreen> createState() => _FarmsScreenState();
}

class _FarmsScreenState extends State<FarmsScreen> {
  bool _isLoading = true;
  List<dynamic> _farms = [];

  static const _brandGreen = Color(0xFF22C55E);

  @override
  void initState() {
    super.initState();
    _fetchFarms();
  }

  Future<void> _fetchFarms() async {
    setState(() => _isLoading = true);
    try {
      final api = context.read<ApiService>();
      final data = await api.getFarms();
      setState(() {
        _farms = data;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching farms: $e');
      setState(() {
        _isLoading = false;
        _farms = [];
      });
    }
  }

  void _showAddFarmSheet() {
    final nameCtrl = TextEditingController();
    final areaCtrl = TextEditingController();
    final locationCtrl = TextEditingController();
    String selectedUnit = 'acres';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
                left: 24,
                right: 24,
                top: 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Add New Farm', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 24),
                  TextField(
                    controller: nameCtrl,
                    decoration: InputDecoration(
                      labelText: 'Farm Name',
                      filled: true,
                      fillColor: Colors.grey.shade50,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: TextField(
                          controller: areaCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: InputDecoration(
                            labelText: 'Area Size',
                            filled: true,
                            fillColor: Colors.grey.shade50,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        flex: 1,
                        child: DropdownButtonFormField<String>(
                          value: selectedUnit,
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: Colors.grey.shade50,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'acres', child: Text('Acres')),
                            DropdownMenuItem(value: 'hectares', child: Text('Hectares')),
                          ],
                          onChanged: (val) {
                            if (val != null) setSheetState(() => selectedUnit = val);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: locationCtrl,
                    decoration: InputDecoration(
                      labelText: 'Location / Region',
                      filled: true,
                      fillColor: Colors.grey.shade50,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 24),
                  GradientButton(
                    text: 'Add Farm',
                    isLoading: _isLoading,
                    onPressed: () async {
                      if (nameCtrl.text.isEmpty || areaCtrl.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all required fields.')));
                        return;
                      }
                      Navigator.pop(ctx);
                      setState(() => _isLoading = true);
                      try {
                        final api = context.read<ApiService>();
                        await api.createFarm({
                          'name': nameCtrl.text,
                          'area': double.parse(areaCtrl.text),
                          'unit': selectedUnit,
                          'location': locationCtrl.text,
                        });
                        await _fetchFarms();
                      } catch (e) {
                        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                        setState(() => _isLoading = false);
                      }
                    },
                  ),
                ],
              ),
            );
          }
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Farms'),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchFarms,
        color: _brandGreen,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: _brandGreen))
            : _farms.isEmpty
                ? ListView(
                    padding: const EdgeInsets.all(32),
                    children: [
                      const SizedBox(height: 100),
                      const Icon(Icons.landscape_outlined, size: 64, color: Colors.black26),
                      const SizedBox(height: 16),
                      const Text(
                        'No farms added yet',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black54),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Add a farm to start managing your crops and tracking progress.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.black45),
                      ),
                      const SizedBox(height: 32),
                      GradientButton(
                        icon: Icons.add,
                        text: 'Add Your First Farm',
                        onPressed: _showAddFarmSheet,
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _farms.length,
                    itemBuilder: (context, index) {
                      final farm = _farms[index];
                      return GlassCard(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: EdgeInsets.zero,
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          leading: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.brand500.withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.landscape, color: AppTheme.brand500),
                          ),
                          title: Text(
                            farm['name'] ?? 'Farm',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          subtitle: Text(
                            '${farm['area'] ?? 0} ${farm['unit'] ?? 'acres'} • ${farm['location'] ?? 'Unknown'}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          trailing: const Icon(Icons.chevron_right, color: Colors.black26),
                          onTap: () {},
                        ),
                      );
                    },
                  ),
      ),
      floatingActionButton: _farms.isNotEmpty ? FloatingActionButton(
        onPressed: _showAddFarmSheet,
        backgroundColor: _brandGreen,
        child: const Icon(Icons.add, color: Colors.white),
      ) : null,
    );
  }
}
