import 'package:flutter/material.dart';
import 'chatbot_service.dart';  // chatbot_service.dart 파일을 임포트

void main() {
  runApp(ChatApp());
}

class ChatApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: ChatScreen(),
    );
  }
}

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ChatbotService _chatbotService = ChatbotService();  // ChatbotService 객체 생성
  List<Map<String, String>> messages = [];

  void _sendMessage() async {
    String text = _controller.text;
    if (text.isEmpty) return;

    setState(() {
      messages.add({'who': 'user', 'message': text});
    });

    _controller.clear();

    // 서버에 메시지 전송하여 AI 응답 받기
    try {
      var response = await _chatbotService.sendMessage(text);

      setState(() {
        messages.add({'who': 'bot', 'message': response['fulfillmentText'] ?? '응답 없음'});
      });
    } catch (error) {
      setState(() {
        messages.add({'who': 'bot', 'message': '에러가 발생했습니다.'});
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('AI 챗봇')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: messages.length,
              itemBuilder: (context, index) {
                return ListTile(
                  title: Text(
                    messages[index]['message']!,
                    style: TextStyle(
                      fontFamily: 'NotoSans',  // NotoSans 글꼴 적용
                      color: messages[index]['who'] == 'user' ? Colors.blue : Colors.green,
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(labelText: '메시지를 입력하세요'),
                    style: TextStyle(fontFamily: 'NotoSans'),  // 텍스트 입력 시 글꼴 적용
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.send),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
