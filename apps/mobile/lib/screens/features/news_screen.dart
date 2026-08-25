import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class NewsScreen extends StatefulWidget {
  const NewsScreen({super.key});

  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> {
  final ScrollController _scrollController = ScrollController();
  final List<dynamic> _articles = [];
  int _page = 1;
  bool _isLoading = false;
  bool _hasMore = true;
  bool _isCachedData = false;
  static const String _cacheKey = 'agri_news_cache';

  @override
  void initState() {
    super.initState();
    _fetchNews();
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200 && !_isLoading && _hasMore) {
        _fetchNews();
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchNews({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _page = 1;
        _hasMore = true;
        _articles.clear();
        _isCachedData = false;
      });
    }

    if (!_hasMore || _isLoading) return;

    setState(() => _isLoading = true);

    try {
      final api = context.read<ApiService>();
      final response = await api.getNews(page: _page, limit: 15);
      
      // Defensively parse API response based on common patterns
      List<dynamic> newArticles = [];
      if (response.containsKey('data') && response['data'] is List) {
        newArticles = response['data'];
      } else if (response.containsKey('items') && response['items'] is List) {
        newArticles = response['items'];
      } else if (response.containsKey('news') && response['news'] is List) {
        newArticles = response['news'];
      } else if (response.containsKey('articles') && response['articles'] is List) {
        newArticles = response['articles'];
      }

      if (mounted) {
        setState(() {
          _articles.addAll(newArticles);
          if (newArticles.isEmpty || newArticles.length < 15) {
            _hasMore = false;
          } else {
            _page++;
          }
          _isLoading = false;
        });
        
        // Cache up to 100 articles
        try {
          final prefs = await SharedPreferences.getInstance();
          final cacheList = _articles.take(100).toList();
          await prefs.setString(_cacheKey, jsonEncode(cacheList));
        } catch (e) {
          debugPrint('Error caching news: $e');
        }
      }
    } catch (e) {
      debugPrint('Error fetching news: $e');
      if (mounted) {
        if (_page == 1) {
          // Attempt to load from cache
          try {
            final prefs = await SharedPreferences.getInstance();
            final cachedData = prefs.getString(_cacheKey);
            if (cachedData != null) {
              final List<dynamic> decoded = jsonDecode(cachedData);
              setState(() {
                _articles.addAll(decoded);
                _isCachedData = true;
                _hasMore = false; // Disable pagination for cached data
                _isLoading = false;
              });
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Showing offline cached news.')));
              return;
            }
          } catch (cacheError) {
            debugPrint('Error reading cache: $cacheError');
          }
        }
        
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error loading news: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Agri News & Schemes',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (_isCachedData)
                  Container(
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
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => _fetchNews(refresh: true),
              color: AppTheme.brand500,
              child: _articles.isEmpty && _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.brand500))
                  : _articles.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 100),
                            Center(child: Text('No news found', style: TextStyle(color: AppTheme.textSecondary))),
                          ],
                        )
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(horizontal: 20).copyWith(bottom: 120),
                          itemCount: _articles.length + (_hasMore ? 1 : 0),
                          itemBuilder: (context, index) {
                            if (index == _articles.length) {
                              return const Padding(
                                padding: EdgeInsets.symmetric(vertical: 24),
                                child: Center(child: CircularProgressIndicator(color: AppTheme.brand500)),
                              );
                            }
                            
                            final article = _articles[index];
                            final title = article['title'] ?? 'No Title';
                            final rawDesc = article['description'] ?? article['summary'] ;
                            final description = (rawDesc != null && rawDesc.toString().trim().isNotEmpty) 
                                ? rawDesc.toString() : null;
                            final source = article['source'] ?? 'Agri News';
                            final url = article['url'] ?? article['link'];
                            
                            return GestureDetector(
                              onTap: () async {
                                if (url != null && url.toString().isNotEmpty) {
                                  final uri = Uri.parse(url.toString());
                                  if (await canLaunchUrl(uri)) {
                                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                                  } else {
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open the article.')));
                                    }
                                  }
                                } else {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No link available for this article.')));
                                  }
                                }
                              },
                              child: Container(
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
                                      children: [
                                        const Icon(Icons.newspaper, size: 16, color: AppTheme.brand500),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            source,
                                            style: const TextStyle(
                                              color: AppTheme.brand500,
                                              fontWeight: FontWeight.w700,
                                              fontSize: 12,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      title,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                        color: AppTheme.textPrimary,
                                        height: 1.3,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      description??"",
                                      maxLines: 3,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        color: AppTheme.textSecondary,
                                        height: 1.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}
