import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/api_service.dart';
import '../../services/firestore_service.dart';
import '../../services/local_ai_service.dart';
import '../../theme/app_theme.dart';

import 'dart:async';

class CropsScreen extends StatefulWidget {
  const CropsScreen({super.key});

  @override
  State<CropsScreen> createState() => CropsScreenState();
}

class CropsScreenState extends State<CropsScreen> {
  bool _isLoading = true;
  List<dynamic> _farms = [];
  String? _selectedFarmId;
  List<dynamic> _crops = [];
  StreamSubscription? _cropSub;

  static const _brandGreen = Color(0xFF22C55E);

  @override
  void initState() {
    super.initState();
    _fetchInitialData();
  }

  @override
  void dispose() {
    _cropSub?.cancel();
    super.dispose();
  }

  Future<void> _fetchInitialData() async {
    setState(() => _isLoading = true);
    try {
      final firestore = context.read<FirestoreService>();
      final farms = await firestore.getFarmsOnce();
      if (mounted) {
        setState(() {
          _farms = farms;
          if (farms.isNotEmpty) {
            _selectedFarmId = farms[0]['id'];
          }
        });
        if (_selectedFarmId != null) {
          _subscribeCrops(_selectedFarmId!);
        } else {
          setState(() => _isLoading = false);
        }
      }
    } catch (e) {
      debugPrint('Error: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _subscribeCrops(String farmId) {
    setState(() => _isLoading = true);
    _cropSub?.cancel();
    final firestore = context.read<FirestoreService>();
    _cropSub = firestore
        .streamCrops(farmId)
        .listen(
          (crops) {
            if (mounted) {
              setState(() {
                _crops = crops;
                _isLoading = false;
              });
            }
          },
          onError: (e) {
            debugPrint('Error fetching crops from Firestore: $e');
            if (mounted) setState(() => _isLoading = false);
          },
        );
  }

  Future<void> _refreshCrops() async {
    await Future.delayed(const Duration(milliseconds: 500));
  }

  void showAddCropSheet() {
    if (_selectedFarmId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please add a farm first.')));
      return;
    }

    final nameCtrl = TextEditingController();
    final areaCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom:
                MediaQuery.of(ctx).viewInsets.bottom +
                MediaQuery.of(ctx).padding.bottom +
                24,
            left: 24,
            right: 24,
            top: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Add Crop',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: nameCtrl,
                decoration: InputDecoration(
                  labelText: 'Crop Name (e.g. Wheat, Rice)',
                  filled: true,
                  fillColor: Colors.grey.shade50,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: areaCtrl,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: InputDecoration(
                  labelText: 'Area planted (acres/hectares)',
                  filled: true,
                  fillColor: Colors.grey.shade50,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              GradientButton(
                text: 'Add Crop',
                isLoading: _isLoading,
                onPressed: () async {
                  if (nameCtrl.text.isEmpty) return;
                  Navigator.pop(ctx);
                  setState(() => _isLoading = true);
                  try {
                    final firestore = context.read<FirestoreService>();
                    await firestore.addCrop(_selectedFarmId!, {
                      'name': nameCtrl.text,
                      'area': double.tryParse(areaCtrl.text) ?? 0.0,
                      'planting_date': DateTime.now().toIso8601String(),
                      'status': 'active',
                    });
                    // Stream will automatically update the UI
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Crop added successfully!'),
                        ),
                      );
                      setState(() => _isLoading = false);
                    }
                  } catch (e) {
                    if (mounted)
                      ScaffoldMessenger.of(context)
                          .showSnackBar(SnackBar(content: Text('Error: $e')));
                    setState(() => _isLoading = false);
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void showAIRecommendationSheet() {
    bool isRecLoading = false;
    List<dynamic>? recommendations;
    String? explanation;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              height: MediaQuery.of(ctx).size.height * 0.9,
              padding: EdgeInsets.only(
                bottom:
                    MediaQuery.of(ctx).viewInsets.bottom +
                    MediaQuery.of(ctx).padding.bottom +
                    24,
                left: 24,
                right: 24,
                top: 24,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Crop Intelligence',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'AI-driven crop recommendations based on your soil, weather, and agronomic data.',
                    style: TextStyle(color: Colors.black54),
                  ),
                  const SizedBox(height: 24),

                  if (recommendations == null && !isRecLoading)
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: AppTheme.brand500.withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.psychology,
                              size: 48,
                              color: AppTheme.brand500,
                            ),
                          ),
                          const SizedBox(height: 24),
                          const Text(
                            'Ready to plan your next harvest?',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Get AI recommendations to see which crops will thrive in your conditions.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.black54),
                          ),
                          const SizedBox(height: 32),
                          GradientButton(
                            text: 'Get AI Recommendations',
                            onPressed: () async {
                              if (_selectedFarmId == null) return;
                              setSheetState(() => isRecLoading = true);
                              try {
                                final api = context.read<ApiService>();
                                final result = await api.recommendCrop({
                                  'farm_id': _selectedFarmId,
                                  'latitude': 20.0,
                                  'longitude': 85.0,
                                  'language': 'en',
                                  'season': 'kharif',
                                });

                                setSheetState(() {
                                  recommendations = result['recommendations'];
                                  explanation = result['explanation'];
                                  isRecLoading = false;
                                });
                              } catch (e) {
                                debugPrint('API failed, falling back to Local AI: $e');
                                try {
                                  final localAi = context.read<LocalAIService>();
                                  final result = await localAi.recommendCrop({
                                    'farm_id': _selectedFarmId,
                                  });
                                  
                                  setSheetState(() {
                                    recommendations = result['recommendations'];
                                    explanation = result['explanation'];
                                    isRecLoading = false;
                                  });
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Offline mode: Using local AI fallback.', style: TextStyle(color: Colors.white)), backgroundColor: Colors.orange),
                                    );
                                  }
                                } catch (localError) {
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Failed: $localError')),
                                    );
                                  }
                                  setSheetState(() => isRecLoading = false);
                                }
                              }
                            },
                          ),
                        ],
                      ),
                    ),

                  if (isRecLoading)
                    const Expanded(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(color: AppTheme.brand500),
                            SizedBox(height: 24),
                            Text(
                              'Analyzing Agronomic Data',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                              ),
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Evaluating soil profile, ML predictions, and current weather patterns...',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.black54),
                            ),
                          ],
                        ),
                      ),
                    ),

                  if (recommendations != null && !isRecLoading) ...[
                    if (explanation != null)
                      GlassCard(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.brand500.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text(
                                'AI Advice',
                                style: TextStyle(
                                  color: AppTheme.brand700,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              explanation!,
                              style: const TextStyle(fontSize: 14, height: 1.5),
                            ),
                          ],
                        ),
                      ),
                    const Text(
                      'Top Recommended Crops',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: ListView.builder(
                        itemCount: recommendations!.length,
                        itemBuilder: (context, index) {
                          final rec = recommendations![index];
                          return GlassCard(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: index == 0
                                            ? AppTheme.brand500
                                            : AppTheme.brand500.withValues(
                                                alpha: 0.1,
                                              ),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Center(
                                        child: Text(
                                          '${index + 1}',
                                          style: TextStyle(
                                            color: index == 0
                                                ? Colors.white
                                                : AppTheme.brand700,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          (rec['crop'] ?? '')
                                              .toString()
                                              .toUpperCase(),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w900,
                                            fontSize: 16,
                                          ),
                                        ),
                                        const Text(
                                          'Composite Match Score',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: Colors.black54,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                Text(
                                  '${((rec['score'] ?? 0) * 100).toStringAsFixed(0)}%',
                                  style: const TextStyle(
                                    color: AppTheme.brand500,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 24,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                children: [
                  const Text(
                    'Farm: ',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.black54,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _farms.isEmpty
                        ? const Text('No farms available')
                        : DropdownButton<String>(
                            isExpanded: true,
                            value: _selectedFarmId,
                            underline: const SizedBox(),
                            items: _farms
                                .map(
                                  (f) => DropdownMenuItem<String>(
                                    value: f['id'],
                                    child: Text(
                                      f['name'] ?? 'Farm',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                )
                                .toList(),
                            onChanged: (val) {
                              if (val != null && val != _selectedFarmId) {
                                setState(() => _selectedFarmId = val);
                                _subscribeCrops(val);
                              }
                            },
                          ),
                  ),
                ],
              ),
            ),
            if (_selectedFarmId != null && _crops.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 8,
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: showAddCropSheet,
                    icon: const Icon(Icons.add),
                    label: const Text(
                      'Add Crop',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _brandGreen,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () =>
                    _selectedFarmId != null ? _refreshCrops() : Future.value(),
                color: _brandGreen,
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(color: _brandGreen),
                      )
                    : _crops.isEmpty
                    ? ListView(
                        padding: const EdgeInsets.all(32),
                        children: [
                          const SizedBox(height: 20),
                          GlassCard(
                            padding: const EdgeInsets.symmetric(
                              vertical: 48,
                              horizontal: 24,
                            ),
                            child: Column(
                              children: [
                                Container(
                                  width: 80,
                                  height: 80,
                                  decoration: BoxDecoration(
                                    color: AppTheme.brand500.withValues(
                                      alpha: 0.1,
                                    ),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.grass,
                                    size: 40,
                                    color: AppTheme.brand500,
                                  ),
                                ),
                                const SizedBox(height: 24),
                                const Text(
                                  'No active crops',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.black87,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                const Text(
                                  'Track your current harvest to receive timely disease alerts, irrigation tips, and growth insights.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.black54,
                                    height: 1.5,
                                  ),
                                ),
                                const SizedBox(height: 32),
                                GradientButton(
                                  icon: Icons.add,
                                  text: 'Log First Crop',
                                  onPressed: showAddCropSheet,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: _brandGreen,
                              side: const BorderSide(color: _brandGreen),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              padding: const EdgeInsets.all(16),
                            ),
                            onPressed: showAIRecommendationSheet,
                            icon: const Icon(Icons.psychology),
                            label: const Text(
                              'Ask AI For Recommendation',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _crops.length,
                        itemBuilder: (context, index) {
                          final crop = _crops[index];
                          final String cropName =
                              crop['name'] ?? crop['crop_name'] ?? 'Crop';
                          final String variety =
                              crop['variety'] ?? 'Standard Variety';
                          final String stage =
                              crop['status'] ?? crop['stage'] ?? 'Seedling';
                          final String plantedDate =
                              crop['planting_date'] ??
                              crop['sowing_date'] ??
                              '';

                          String formattedDate = 'Unknown';
                          if (plantedDate.isNotEmpty) {
                            try {
                              final d = DateTime.parse(plantedDate);
                              formattedDate = '${d.day}/${d.month}/${d.year}';
                            } catch (_) {}
                          }

                          return GlassCard(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: EdgeInsets.zero,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                // Top half: Image / Icon area
                                Container(
                                  height: 140,
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                      colors: [
                                        AppTheme.brand500.withValues(
                                          alpha: 0.15,
                                        ),
                                        AppTheme.brand500.withValues(
                                          alpha: 0.05,
                                        ),
                                      ],
                                    ),
                                    border: Border(
                                      bottom: BorderSide(
                                        color: AppTheme.brand500.withValues(
                                          alpha: 0.1,
                                        ),
                                      ),
                                    ),
                                  ),
                                  child: Stack(
                                    children: [
                                      Center(
                                        child: Icon(
                                          Icons.grass,
                                          size: 64,
                                          color: AppTheme.brand500.withValues(
                                            alpha: 0.2,
                                          ),
                                        ),
                                      ),
                                      Positioned(
                                        top: 12,
                                        right: 12,
                                        child: Row(
                                          children: [
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 10,
                                                    vertical: 6,
                                                  ),
                                              decoration: BoxDecoration(
                                                color: Colors.white.withValues(
                                                  alpha: 0.9,
                                                ),
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                                border: Border.all(
                                                  color: AppTheme.brand500
                                                      .withValues(alpha: 0.2),
                                                ),
                                              ),
                                              child: Text(
                                                stage.toUpperCase(),
                                                style: const TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w900,
                                                  letterSpacing: 1.5,
                                                  color: AppTheme.brand700,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            InkWell(
                                              onTap: () async {
                                                setState(
                                                  () => _isLoading = true,
                                                );
                                                try {
                                                  await context
                                                      .read<FirestoreService>()
                                                      .deleteCrop(
                                                        _selectedFarmId!,
                                                        crop['id'],
                                                      );
                                                  // Stream will update UI
                                                  if (mounted)
                                                    setState(
                                                      () => _isLoading = false,
                                                    );
                                                } catch (e) {
                                                  if (mounted)
                                                    ScaffoldMessenger.of(
                                                      context,
                                                    ).showSnackBar(
                                                      SnackBar(
                                                        content: Text(
                                                          'Failed: $e',
                                                        ),
                                                      ),
                                                    );
                                                  setState(
                                                    () => _isLoading = false,
                                                  );
                                                }
                                              },
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              child: Container(
                                                padding: const EdgeInsets.all(
                                                  6,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: Colors.white
                                                      .withValues(alpha: 0.9),
                                                  borderRadius:
                                                      BorderRadius.circular(8),
                                                  border: Border.all(
                                                    color: AppTheme.error
                                                        .withValues(alpha: 0.2),
                                                  ),
                                                ),
                                                child: const Icon(
                                                  Icons.delete_outline,
                                                  size: 16,
                                                  color: AppTheme.error,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                // Bottom half: Details & Actions
                                Padding(
                                  padding: const EdgeInsets.all(20),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        cropName.toUpperCase(),
                                        style: Theme.of(context)
                                            .textTheme
                                            .headlineSmall
                                            ?.copyWith(
                                              fontWeight: FontWeight.w900,
                                            ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        variety.toUpperCase(),
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 1.5,
                                          color: Colors.black45,
                                        ),
                                      ),
                                      const SizedBox(height: 24),

                                      // Planted On
                                      Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: Colors.black.withValues(
                                            alpha: 0.03,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          border: Border.all(
                                            color: Colors.black.withValues(
                                              alpha: 0.03,
                                            ),
                                          ),
                                        ),
                                        child: Row(
                                          children: [
                                            Container(
                                              width: 32,
                                              height: 32,
                                              decoration: BoxDecoration(
                                                color: AppTheme.brand500
                                                    .withValues(alpha: 0.1),
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                              ),
                                              child: const Icon(
                                                Icons.calendar_today,
                                                size: 14,
                                                color: AppTheme.brand600,
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                const Text(
                                                  'PLANTED ON',
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w900,
                                                    letterSpacing: 1.2,
                                                    color: Colors.black54,
                                                  ),
                                                ),
                                                Text(
                                                  formattedDate,
                                                  style: const TextStyle(
                                                    fontSize: 14,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),

                                      const SizedBox(height: 24),

                                      // Actions
                                      Row(
                                        children: [
                                          Expanded(
                                            child: OutlinedButton.icon(
                                              onPressed: () {
                                                ScaffoldMessenger.of(context)
                                                    .showSnackBar(
                                                      const SnackBar(
                                                        content: Text(
                                                          'Use the Disease Detection tab to scan.',
                                                        ),
                                                      ),
                                                    );
                                              },
                                              icon: const Icon(
                                                Icons.camera_alt,
                                                size: 16,
                                              ),
                                              label: const Text(
                                                'Scan Image',
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              style: OutlinedButton.styleFrom(
                                                foregroundColor:
                                                    AppTheme.brand700,
                                                backgroundColor:
                                                    AppTheme.brand50,
                                                side: BorderSide(
                                                  color: AppTheme.brand500
                                                      .withValues(alpha: 0.1),
                                                ),
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                      vertical: 12,
                                                    ),
                                                shape: RoundedRectangleBorder(
                                                  borderRadius:
                                                      BorderRadius.circular(12),
                                                ),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: OutlinedButton.icon(
                                              onPressed: () {
                                                ScaffoldMessenger.of(context)
                                                    .showSnackBar(
                                                      const SnackBar(
                                                        content: Text(
                                                          'Stage update coming soon.',
                                                        ),
                                                      ),
                                                    );
                                              },
                                              icon: const Icon(
                                                Icons.update,
                                                size: 16,
                                              ),
                                              label: const Text(
                                                'Update Stage',
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              style: OutlinedButton.styleFrom(
                                                foregroundColor:
                                                    Colors.blue.shade700,
                                                backgroundColor:
                                                    Colors.blue.shade50,
                                                side: BorderSide(
                                                  color: Colors.blue.shade500
                                                      .withValues(alpha: 0.1),
                                                ),
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                      vertical: 12,
                                                    ),
                                                shape: RoundedRectangleBorder(
                                                  borderRadius:
                                                      BorderRadius.circular(12),
                                                ),
                                              ),
                                            ),
                                          ),
                                        ],
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
          ],
        ),
      ),
    );
  }
}
