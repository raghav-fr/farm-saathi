import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/firestore_service.dart';
import '../../theme/app_theme.dart';
import 'dart:async';

class FarmsScreen extends StatefulWidget {
  const FarmsScreen({super.key});

  @override
  State<FarmsScreen> createState() => _FarmsScreenState();
}

class _FarmsScreenState extends State<FarmsScreen> {
  bool _isLoading = true;
  List<dynamic> _farms = [];

  static const _brandGreen = Color(0xFF22C55E);

  StreamSubscription? _farmSub;

  @override
  void initState() {
    super.initState();
    _subscribeFarms();
  }

  @override
  void dispose() {
    _farmSub?.cancel();
    super.dispose();
  }

  void _subscribeFarms() {
    setState(() => _isLoading = true);
    final firestore = context.read<FirestoreService>();
    _farmSub = firestore.streamFarms().listen(
      (data) {
        if (mounted) {
          setState(() {
            _farms = data;
            _isLoading = false;
          });
        }
      },
      onError: (e) {
        debugPrint('Error fetching farms from Firestore: $e');
        if (mounted) {
          setState(() {
            _isLoading = false;
            _farms = [];
          });
        }
      },
    );
  }

  Future<void> _refreshFarms() async {
    // With streams, we don't need a manual refresh for the network, but we can simulate a pull to refresh 
    // by just waiting a short duration. Realtime updates handle the rest.
    await Future.delayed(const Duration(milliseconds: 500));
  }

  void _showAddFarmSheet() {
    final nameCtrl = TextEditingController();
    final areaCtrl = TextEditingController();
    final locationCtrl = TextEditingController();
    String selectedSoil = 'unknown';
    bool hasIrrigation = false;
    String irrigationType = 'rainfed';

    final soilOptions = ['clay', 'sandy', 'loamy', 'silty', 'black', 'red', 'laterite', 'unknown'];
    final irrigationOptions = ['drip', 'sprinkler', 'canal', 'borewell', 'pond', 'rainfed'];

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
                bottom: MediaQuery.of(ctx).viewInsets.bottom + MediaQuery.of(ctx).padding.bottom + 24,
                left: 24,
                right: 24,
                top: 24,
              ),
              child: SingleChildScrollView(
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
                    TextField(
                      controller: areaCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Area Size (Hectares)',
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
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
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: selectedSoil,
                      decoration: InputDecoration(
                        labelText: 'Soil Type',
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                      items: soilOptions.map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase()))).toList(),
                      onChanged: (val) {
                        if (val != null) setSheetState(() => selectedSoil = val);
                      },
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Switch(
                          value: hasIrrigation,
                          activeColor: _brandGreen,
                          onChanged: (val) {
                            setSheetState(() => hasIrrigation = val);
                          },
                        ),
                        const SizedBox(width: 8),
                        const Text('Has Irrigation?', style: TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    if (hasIrrigation) ...[
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        value: irrigationType,
                        decoration: InputDecoration(
                          labelText: 'Irrigation Type',
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                        ),
                        items: irrigationOptions.map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase()))).toList(),
                        onChanged: (val) {
                          if (val != null) setSheetState(() => irrigationType = val);
                        },
                      ),
                    ],
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
                          final firestore = context.read<FirestoreService>();
                          await firestore.addFarm({
                            'name': nameCtrl.text,
                            'area_hectares': double.parse(areaCtrl.text),
                            'location': locationCtrl.text,
                            'soil_type': selectedSoil,
                            'has_irrigation': hasIrrigation,
                            'irrigation_type': hasIrrigation ? irrigationType : 'rainfed',
                          });
                          if (mounted) {
                             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Farm added successfully!')));
                             setState(() => _isLoading = false);
                          }
                        } catch (e) {
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                          setState(() => _isLoading = false);
                        }
                      },
                    ),
                  ],
                ),
              ),
            );
          }
        );
      },
    );
  }

  void _showEditFarmSheet(Map<String, dynamic> farm) {
    final nameCtrl = TextEditingController(text: farm['name']);
    final areaCtrl = TextEditingController(text: farm['area_hectares']?.toString());
    final locationCtrl = TextEditingController(text: farm['location']);
    String selectedSoil = farm['soil_type'] ?? 'unknown';
    bool hasIrrigation = farm['has_irrigation'] ?? false;
    String irrigationType = farm['irrigation_type'] ?? 'rainfed';

    final soilOptions = ['clay', 'sandy', 'loamy', 'silty', 'black', 'red', 'laterite', 'unknown'];
    final irrigationOptions = ['drip', 'sprinkler', 'canal', 'borewell', 'pond', 'rainfed'];

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
                bottom: MediaQuery.of(ctx).viewInsets.bottom + MediaQuery.of(ctx).padding.bottom + 24,
                left: 24,
                right: 24,
                top: 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('Edit Farm', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
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
                    TextField(
                      controller: areaCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Area Size (Hectares)',
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
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
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: soilOptions.contains(selectedSoil) ? selectedSoil : 'unknown',
                      decoration: InputDecoration(
                        labelText: 'Soil Type',
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                      items: soilOptions.map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase()))).toList(),
                      onChanged: (val) {
                        if (val != null) setSheetState(() => selectedSoil = val);
                      },
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Switch(
                          value: hasIrrigation,
                          activeColor: _brandGreen,
                          onChanged: (val) {
                            setSheetState(() => hasIrrigation = val);
                          },
                        ),
                        const SizedBox(width: 8),
                        const Text('Has Irrigation?', style: TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    if (hasIrrigation) ...[
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        value: irrigationOptions.contains(irrigationType) ? irrigationType : 'rainfed',
                        decoration: InputDecoration(
                          labelText: 'Irrigation Type',
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                        ),
                        items: irrigationOptions.map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase()))).toList(),
                        onChanged: (val) {
                          if (val != null) setSheetState(() => irrigationType = val);
                        },
                      ),
                    ],
                    const SizedBox(height: 24),
                    GradientButton(
                      text: 'Save Changes',
                      isLoading: _isLoading,
                      onPressed: () async {
                        if (nameCtrl.text.isEmpty || areaCtrl.text.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all required fields.')));
                          return;
                        }
                        Navigator.pop(ctx);
                        setState(() => _isLoading = true);
                        try {
                          final firestore = context.read<FirestoreService>();
                          await firestore.updateFarm(farm['id'], {
                            'name': nameCtrl.text,
                            'area_hectares': double.parse(areaCtrl.text),
                            'location': locationCtrl.text,
                            'soil_type': selectedSoil,
                            'has_irrigation': hasIrrigation,
                            'irrigation_type': hasIrrigation ? irrigationType : 'rainfed',
                          });
                          if (mounted) {
                             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Farm updated successfully!')));
                             setState(() => _isLoading = false);
                          }
                        } catch (e) {
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                          setState(() => _isLoading = false);
                        }
                      },
                    ),
                  ],
                ),
              ),
            );
          }
        );
      },
    );
  }

  void _confirmDeleteFarm(Map<String, dynamic> farm) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Farm?'),
        content: Text('Are you sure you want to delete ${farm['name']}? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() => _isLoading = true);
              try {
                await context.read<FirestoreService>().deleteFarm(farm['id']);
                if (mounted) setState(() => _isLoading = false);
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                setState(() => _isLoading = false);
              }
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Farms'),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refreshFarms,
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
                        margin: const EdgeInsets.only(bottom: 24),
                        padding: EdgeInsets.zero,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(20),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        width: 48,
                                        height: 48,
                                        decoration: BoxDecoration(
                                          gradient: const LinearGradient(
                                            colors: [Color(0xFF22c55e), Color(0xFF16a34a)],
                                            begin: Alignment.topLeft,
                                            end: Alignment.bottomRight,
                                          ),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Icon(Icons.landscape, color: Colors.white, size: 24),
                                      ),
                                      const SizedBox(width: 16),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            farm['name'] ?? 'Farm',
                                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                          ),
                                          const SizedBox(height: 4),
                                          Row(
                                            children: [
                                              const Icon(Icons.location_on, size: 12, color: Colors.black54),
                                              const SizedBox(width: 4),
                                              Text(
                                                farm['location'] ?? 'Unknown Location',
                                                style: const TextStyle(fontSize: 12, color: Colors.black54),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.edit, size: 20, color: Colors.black54),
                                        onPressed: () => _showEditFarmSheet(farm),
                                        constraints: const BoxConstraints(),
                                        padding: const EdgeInsets.symmetric(horizontal: 8),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline, size: 20, color: Colors.red),
                                        onPressed: () => _confirmDeleteFarm(farm),
                                        constraints: const BoxConstraints(),
                                        padding: const EdgeInsets.symmetric(horizontal: 8),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const Divider(height: 1, color: Colors.black12),
                            Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('AREA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54)),
                                            const SizedBox(height: 4),
                                            Text('${farm['area_hectares'] ?? 0} Hectares', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                                          ],
                                        ),
                                      ),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('SOIL TYPE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54)),
                                            const SizedBox(height: 4),
                                            Text(
                                              (farm['soil_type'] ?? 'Unknown').toString().toUpperCase(), 
                                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)
                                            ),
                                          ],
                                        ),
                                      ),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('IRRIGATION', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54)),
                                            const SizedBox(height: 4),
                                            Row(
                                              children: [
                                                const Icon(Icons.water_drop, size: 14, color: Colors.blue),
                                                const SizedBox(width: 4),
                                                Text(
                                                  farm['has_irrigation'] == true ? (farm['irrigation_type'] ?? 'Yes').toString().toUpperCase() : 'RAINFED', 
                                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.blue)
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 24),
                                  Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: Colors.amber.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: Colors.amber.withValues(alpha: 0.2),
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(Icons.info_outline, color: Colors.amber, size: 24),
                                        ),
                                        const SizedBox(width: 16),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              const Text('No Soil Test Record Found', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
                                              const SizedBox(height: 4),
                                              const Text('Add a recent NPK / pH soil test report to get highly accurate ML crop recommendations.', style: TextStyle(fontSize: 12, color: Colors.black54)),
                                              const SizedBox(height: 8),
                                              OutlinedButton(
                                                onPressed: () {},
                                                style: OutlinedButton.styleFrom(
                                                  foregroundColor: Colors.amber.shade700,
                                                  side: BorderSide(color: Colors.amber.shade700),
                                                  minimumSize: const Size(0, 32),
                                                  padding: const EdgeInsets.symmetric(horizontal: 12),
                                                ),
                                                child: const Text('Add Soil Test', style: TextStyle(fontSize: 12)),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
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
