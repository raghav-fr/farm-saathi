import 'package:flutter/material.dart';

class TypingIndicator extends StatefulWidget {
  final Color color;
  final double size;

  const TypingIndicator({
    super.key,
    this.color = Colors.grey,
    this.size = 10.0,
  });

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (index) {
        return AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            // Calculate a wave effect for each dot based on index
            final offset = (index * 0.2);
            final t = (_controller.value + offset) % 1.0;
            // A simple sine wave approximation for bounce
            final y = (t < 0.5) ? -10.0 * (4 * t * (0.5 - t)) : 0.0;
            final alpha = (t < 0.5) ? 1.0 : 0.5;

            return Transform.translate(
              offset: Offset(0, y),
              child: Opacity(
                opacity: alpha,
                child: Container(
                  width: widget.size,
                  height: widget.size,
                  margin: const EdgeInsets.symmetric(horizontal: 4.0),
                  decoration: BoxDecoration(
                    color: widget.color,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          },
        );
      }),
    );
  }
}
