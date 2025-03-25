import 'dart:convert';
import 'package:http/http.dart' as http;

class ChatbotService {
  // ���� URL�� �����մϴ�. ������ ���ÿ��� ���� ���� ���� localhost ���, ���� ���� �ÿ��� ���� �ּҷ� ����
  final String _baseUrl = 'http://localhost:3000/textQuery';  // ������ URL

  // ������ �޽����� ������ �Լ�
  Future<Map<String, dynamic>> sendMessage(String text) async {
    final response = await http.post(
      Uri.parse(_baseUrl),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'text': text}),
    );

    if (response.statusCode == 200) {
      // �����κ��� �������� ������ �޾��� ��
      return json.decode(response.body);
    } else {
      // ���� ������ ���� ���
      throw Exception('Failed to get response from server');
    }
  }
}
