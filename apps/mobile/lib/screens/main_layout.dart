import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

import 'home_screen.dart';
import 'features/crops_screen.dart';
import 'features/news_screen.dart';
import 'features/disease_screen.dart';
import 'features/market_screen.dart';
import 'features/settings_screen.dart';
import 'chat_screen.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _currentIndex = 0;
  
  final GlobalKey<CropsScreenState> _cropsKey = GlobalKey<CropsScreenState>();

  late final List<Widget> _screens = [
    const HomeScreen(),
    CropsScreen(key: _cropsKey),
    const MarketScreen(),
    const NewsScreen(),
    const SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (_currentIndex == 1)
            FloatingActionButton(
              heroTag: 'crop_rec_fab',
              onPressed: () {
                _cropsKey.currentState?.showAIRecommendationSheet();
              },
              backgroundColor: Colors.white,
              foregroundColor: AppTheme.brand500,
              elevation: 4,
              child: const Icon(Icons.psychology, size: 24),
            )
          else
            FloatingActionButton(
              heroTag: 'disease_fab',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const DiseaseScreen()),
                );
              },
              backgroundColor: AppTheme.brand500,
              foregroundColor: Colors.white,
              elevation: 4,
              child: const Icon(Icons.camera_alt_outlined, size: 24),
            ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.brand500.withValues(alpha: 0.3),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: FloatingActionButton.extended(
              heroTag: 'chat_fab',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ChatScreen()),
                );
              },
              backgroundColor: AppTheme.brand500,
              foregroundColor: Colors.white,
              elevation: 0,
              icon: const Icon(Icons.psychology_outlined),
              label: Text('Ask AI', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          margin: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFF111A12), // Web top-nav background
            borderRadius: BorderRadius.circular(100),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(0, Icons.home_outlined, Icons.home_rounded, 'Home'),
              _buildNavItem(1, Icons.grass_outlined, Icons.grass_rounded, 'Crops'),
              _buildNavItem(2, Icons.storefront_outlined, Icons.storefront_rounded, 'Market'),
              _buildNavItem(3, Icons.newspaper_outlined, Icons.newspaper, 'News'),
              _buildNavItem(4, Icons.settings_outlined, Icons.settings_rounded, 'Settings'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData outlineIcon, IconData solidIcon, String label) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFA3E635) : Colors.transparent, // Web active background
          borderRadius: BorderRadius.circular(100),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSelected ? solidIcon : outlineIcon,
              color: isSelected ? const Color(0xFF111A12) : Colors.white.withValues(alpha: 0.6),
              size: 22,
            ),
            if (isSelected) ...[
              const SizedBox(width: 6),
              Text(
                label,
                style: GoogleFonts.inter(
                  color: const Color(0xFF111A12),
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
