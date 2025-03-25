import 'dart:convert';
import 'package:http/http.dart' as http;

class ChatbotService {
  // 서버 URL을 설정합니다. 서버는 로컬에서 실행 중일 때는 localhost 사용, 실제 배포 시에는 서버 주소로 변경
  final String _baseUrl = 'http://localhost:3000/textQuery';  // 수정된 URL

  // 서버로 메시지를 보내는 함수
  Future<Map<String, dynamic>> sendMessage(String text) async {
    final response = await http.post(
      Uri.parse(_baseUrl),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'text': text}),
    );

    if (response.statusCode == 200) {
      // 서버로부터 정상적인 응답을 받았을 때
      return json.decode(response.body);
    } else {
      // 서버 오류가 있을 경우
      throw Exception('Failed to get response from server');
    }
  }
}
