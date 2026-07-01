import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:app/screens/question_screen.dart';

void main() {
  group('QuestionScreen', () {
    testWidgets('test_answer_option_buttons_have_minimum_touch_target', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: QuestionScreen(),
        ),
      );

      final optionButtons = find.byKey(const Key('answer_option_button'));
      expect(optionButtons, findsWidgets);

      final count = tester.widgetList(optionButtons).length;
      for (int i = 0; i < count; i++) {
        final size = tester.getSize(optionButtons.at(i));
        
        expect(
          size.width,
          greaterThanOrEqualTo(48.0),
          reason: 'Expected answer option buttons to have a minimum touch target of 48x48dp, but received ${size.width}x${size.height}dp on small devices.',
        );
        expect(
          size.height,
          greaterThanOrEqualTo(48.0),
          reason: 'Expected answer option buttons to have a minimum touch target of 48x48dp, but received ${size.width}x${size.height}dp on small devices.',
        );
      }
    });
  });
}
