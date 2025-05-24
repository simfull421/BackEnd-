import 'package:flutter/material.dart';
import 'package:front/screens/study_main_page.dart';
import 'package:front/screens/main_home_page.dart';
import 'package:front/screens/signup_page.dart';
import 'package:front/screens/login_page.dart';
import 'package:front/screens/find_id_base_screen.dart';
import 'package:front/screens/EmailVerificationScreen.dart';
import 'package:front/screens/gemini_screen.dart';
import 'package:front/screens/chatgpt_screen.dart';
import 'package:front/widgets/email_input_field.dart';
import 'package:front/learning_page/screens/main_page.dart';

void main() {

  // 앱 실행
  runApp(const MyApp());
}
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      initialRoute: '/login',
      routes: {
        '/find-id': (context) => const FindIDBaseScreen(
              child: EmailInputField(),
              isNextButtonEnabled: false,
            ),
        '/email-verification': (context) => const EmailVerificationScreen(),
        '/signup': (context) => const SignUpPage(),
        '/login': (context) => const LoginPage(),
        //  '/study' 라우트 수정: 인자(arguments)로 전달된 topicId를 추출하여 StudyMainPage에 전달
        '/study': (context) {
           // 라우트로 전달된 인자를 가져옵니다.
           // 이때 인자는 StudyMainPage에서 필요한 topicId (String 타입)라고 가정합니다.
           final topicId = ModalRoute.of(context)!.settings.arguments as String;

           // 추출한 topicId를 StudyMainPage의 생성자에 넣어 위젯을 생성합니다.
           return StudyMainPage(topicId: topicId);
        },
        '/gemini': (context) => const GeminiScreen(), // <<<< 여기 추가
        '/gpt': (context) => const ChatGPTScreen(),
        '/home': (context) => const MainHomePage(), 
        '/firstPage': (context) => const FirstPage(), 
        
      },
    );
  }
}
