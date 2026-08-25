import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  bool _isLoading = true;
  List<dynamic> _alerts = [];

  static const _brandGreen = Color(0xFF22C55E);

  @override
  void initState() {
    super.initState();
    _fetchAlerts();
  }

  Future<void> _fetchAlerts() async {
    setState(() => _isLoading = true);
    try {
      final api = context.read<ApiService>();
      final data = await api.getAlerts(unreadOnly: false);
      setState(() {
        _alerts = data;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching alerts: $e');
      setState(() {
        _isLoading = false;
        _alerts = [];
      });
    }
  }

  Future<void> _markAsRead(String alertId) async {
    try {
      final api = context.read<ApiService>();
      await api.markAlertRead(alertId);
      await _fetchAlerts(); // Refresh list
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      final api = context.read<ApiService>();
      await api.markAllAlertsRead();
      await _fetchAlerts(); // Refresh list
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Alerts'),
        actions: [
          if (_alerts.any((a) => !(a['isRead'] ?? false)))
            TextButton(
              onPressed: _markAllAsRead,
              child: const Text('Mark all read', style: TextStyle(color: AppTheme.brand600, fontWeight: FontWeight.bold)),
            )
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchAlerts,
        color: _brandGreen,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: _brandGreen))
            : _alerts.isEmpty
                ? ListView(
                    padding: const EdgeInsets.all(32),
                    children: const [
                      SizedBox(height: 100),
                      Icon(Icons.notifications_off_outlined, size: 64, color: Colors.black26),
                      SizedBox(height: 16),
                      Text(
                        'No alerts at the moment',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black54),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _alerts.length,
                    itemBuilder: (context, index) {
                      final alert = _alerts[index];
                      final isRead = alert['isRead'] ?? false;
                      final alertType = alert['type'] ?? 'info';
                      
                      Color iconColor = Colors.blue;
                      IconData iconData = Icons.info_outline;
                      if (alertType == 'warning') {
                        iconColor = Colors.orange;
                        iconData = Icons.warning_amber_rounded;
                      } else if (alertType == 'critical') {
                        iconColor = Colors.red;
                        iconData = Icons.error_outline;
                      } else if (alertType == 'success') {
                        iconColor = _brandGreen;
                        iconData = Icons.check_circle_outline;
                      }

                      return GlassCard(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: EdgeInsets.zero,
                        child: Container(
                          decoration: BoxDecoration(
                            color: isRead ? Colors.transparent : AppTheme.brand50.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(20),
                            border: isRead ? null : Border.all(color: AppTheme.brand200),
                          ),
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            leading: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: iconColor.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(iconData, color: iconColor),
                            ),
                            title: Text(
                              alert['title'] ?? 'Alert',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                              ),
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 8.0),
                              child: Text(
                                alert['message'] ?? '',
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ),
                            trailing: isRead 
                              ? null 
                              : IconButton(
                                  icon: const Icon(Icons.check, color: AppTheme.brand500),
                                  onPressed: () => _markAsRead(alert['id']),
                                ),
                          ),
                        ),
                      );
                    },
                  ),
        ),
      ),
    );
  }
}
