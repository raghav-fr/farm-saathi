import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import '../../services/auth_service.dart';
import '../../services/api_service.dart';
import '../../services/local_ai_service.dart';
import '../../theme/app_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchSettingsData();
  }

  Future<void> _fetchSettingsData() async {
    setState(() => _isLoading = true);
    try {
      // Simulate fetching profile or other settings data
      await Future.delayed(const Duration(milliseconds: 500));
      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching settings data: $e');
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Settings', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: _fetchSettingsData,
        color: theme.colorScheme.primary,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
          // Profile Section
          GlassCard(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.green.shade100,
                  child: Icon(Icons.person, size: 36, color: Colors.green.shade700),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        authService.farmerProfile?['name'] ?? authService.currentUser?.displayName ?? 'Farmer',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0D1F0F)),
                      ),
                      Text(
                        authService.currentUser?.email ?? authService.farmerProfile?['phone'] ?? '',
                        style: const TextStyle(fontSize: 14, color: Colors.black54),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          Text(
            'App Settings',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          
          _buildSettingsTile(
            icon: Icons.language,
            title: 'Language',
            subtitle: 'English',
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Multi-language support coming soon!')),
              );
            },
          ),
          _buildSettingsTile(
            icon: Icons.notifications_outlined,
            title: 'Notifications',
            subtitle: 'View recent alerts',
            onTap: () {
              context.push('/alerts');
            },
          ),
          
          const SizedBox(height: 32),
          
          Text(
            'AI Edge Model Manager',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          
          Consumer<LocalAIService>(
            builder: (context, localAi, child) {
              return GlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Icon(
                          localAi.isModelLoaded ? Icons.check_circle : Icons.storage,
                          color: localAi.isModelLoaded ? Colors.green : Colors.black54,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            localAi.isModelLoaded ? 'AI Model Ready' : 'AI Model Status',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (localAi.isDownloading) ...[
                      LinearProgressIndicator(
                        value: localAi.overallProgress,
                        backgroundColor: Colors.grey.shade200,
                        color: AppTheme.brand500,
                        borderRadius: BorderRadius.circular(8),
                        minHeight: 8,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        localAi.progressText.isNotEmpty ? localAi.progressText : 'Downloading...',
                        style: const TextStyle(fontSize: 12, color: Colors.black54),
                      ),
                    ] else ...[
                      Text(
                        localAi.statusMessage,
                        style: TextStyle(
                          fontSize: 14,
                          color: localAi.isModelLoaded ? Colors.green.shade700 : Colors.red.shade700,
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.analytics, size: 18),
                            label: const Text('Analyze Model'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppTheme.brand700,
                              side: const BorderSide(color: AppTheme.brand500),
                            ),
                            onPressed: () async {
                              final data = await localAi.analyzeModel();
                              if (!context.mounted) return;
                              showDialog(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: const Text('AI Diagnostics'),
                                  content: SingleChildScrollView(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text('File Exists: ${data['exists']}'),
                                        Text('Size: ${data['sizeMB']} (Expected ${data['expectedSize']})'),
                                        Text('Currently Loaded: ${data['isModelLoaded']}'),
                                        Text('Currently Downloading: ${data['isCurrentlyDownloading']}'),
                                        const SizedBox(height: 12),
                                        const Text('Engine Initialization Logs:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
                                        Text(data['lastError'], style: const TextStyle(fontSize: 12, color: Colors.black54)),
                                      ],
                                    ),
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () => Navigator.pop(ctx),
                                      child: const Text('Close'),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.download, size: 18),
                            label: const Text('Re-download'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red.shade600,
                              foregroundColor: Colors.white,
                            ),
                            onPressed: () async {
                              final confirm = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: const Text('Confirm Re-download'),
                                  content: const Text('This will delete the existing AI model and restart the download from scratch. Are you sure?'),
                                  actions: [
                                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                                    TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Re-download', style: TextStyle(color: Colors.red))),
                                  ],
                                ),
                              );
                              if (confirm == true) {
                                await localAi.deleteAndRedownloadModel();
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
          
          const SizedBox(height: 32),
          
          SizedBox(
            width: double.infinity,
            height: 50,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red.shade600,
                side: BorderSide(color: Colors.red.shade200),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.logout),
              label: const Text('Log Out', style: TextStyle(fontWeight: FontWeight.bold)),
              onPressed: () async {
                await authService.signOut();
                if (context.mounted) context.go('/login');
              },
            ),
          ),
          
          const SizedBox(height: 40), // Bottom padding for FAB
        ],
      ),
    ));
  }

  Widget _buildSettingsTile({required IconData icon, required String title, String? subtitle, VoidCallback? onTap}) {
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.zero,
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.green.shade50,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: Colors.green.shade700),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF0D1F0F))),
        subtitle: subtitle != null ? Text(subtitle, style: const TextStyle(fontSize: 12)) : null,
        trailing: const Icon(Icons.chevron_right, color: Colors.black26),
        onTap: onTap,
      ),
    );
  }


}
