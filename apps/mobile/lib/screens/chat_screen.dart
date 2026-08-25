import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../services/local_ai_service.dart';
import '../theme/app_theme.dart';
import '../widgets/typing_indicator.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, String>> _messages = [];
  bool _isGenerating = false;

  void _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _messages.add({'role': 'assistant', 'content': ''});
      _isGenerating = true;
    });
    _controller.clear();

    final aiService = context.read<LocalAIService>();
    final authService = context.read<AuthService>();
    final stream = aiService.generateResponse(text, farmerProfile: authService.farmerProfile);

    int botMsgIndex = _messages.length - 1;

    await for (final token in stream) {
      if (!mounted) return;
      setState(() {
        _messages[botMsgIndex]['content'] = 
            (_messages[botMsgIndex]['content'] ?? '') + token;
      });
    }

    if (mounted) {
      setState(() {
        _isGenerating = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final aiService = context.watch<LocalAIService>();

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Ask AI', style: TextStyle(fontWeight: FontWeight.bold)),
            Text(
              aiService.statusMessage, 
              style: TextStyle(
                fontSize: 12, 
                color: aiService.isModelLoaded ? AppTheme.success : AppTheme.error
              )
            ),
          ],
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0D1F0F)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  final isUser = msg['role'] == 'user';
                  return Align(
                    alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: isUser 
                            ? AppTheme.brand500 
                            : AppTheme.bgCard,
                        border: isUser ? null : Border.all(color: Colors.black12),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: (!isUser && msg['content']!.isEmpty && _isGenerating)
                          ? const Padding(
                              padding: EdgeInsets.symmetric(horizontal: .5, vertical: 8.0),
                              child: TypingIndicator(color: AppTheme.brand500, size: 4.0),
                            )
                          : Text(
                              msg['content']!,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: isUser ? Colors.white : AppTheme.textPrimary,
                              ),
                            ),
                    ),
                  );
                },
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      enabled: aiService.isModelLoaded && !_isGenerating,
                      style: Theme.of(context).textTheme.bodyLarge,
                      decoration: InputDecoration(
                        hintText: aiService.isModelLoaded 
                            ? 'Ask about crops, diseases...' 
                            : 'Download model to chat',
                        hintStyle: Theme.of(context).textTheme.bodyMedium,
                        filled: true,
                        fillColor: AppTheme.bgCard,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(30),
                          borderSide: const BorderSide(color: Colors.black12),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(30),
                          borderSide: const BorderSide(color: Colors.black12),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(30),
                          borderSide: const BorderSide(color: AppTheme.brand500),
                        ),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: aiService.isModelLoaded 
                        ? AppTheme.brand500 
                        : Colors.grey.shade300,
                    radius: 24,
                    child: IconButton(
                      icon: const Icon(Icons.send_outlined, color: Colors.white),
                      onPressed: (aiService.isModelLoaded && !_isGenerating) 
                          ? _sendMessage 
                          : null,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
