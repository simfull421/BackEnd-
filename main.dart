import 'package:flutter/material.dart';
import 'chatbot_service.dart';  // chatbot_service.dart ������ ����Ʈ

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
  final ChatbotService _chatbotService = ChatbotService();  // ChatbotService ��ü ����
  List<Map<String, String>> messages = [];

  void _sendMessage() async {
    String text = _controller.text;
    if (text.isEmpty) return;

    setState(() {
      messages.add({'who': 'user', 'message': text});
    });

    _controller.clear();

    // ������ �޽��� �����Ͽ� AI ���� �ޱ�
    try {
      var response = await _chatbotService.sendMessage(text);

      setState(() {
        messages.add({'who': 'bot', 'message': response['fulfillmentText'] ?? '���� ����'});
      });
    } catch (error) {
      setState(() {
        messages.add({'who': 'bot', 'message': '������ �߻��߽��ϴ�.'});
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('AI ê��')),
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
                      fontFamily: 'NotoSans',  // NotoSans �۲� ����
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
                    decoration: InputDecoration(labelText: '�޽����� �Է��ϼ���'),
                    style: TextStyle(fontFamily: 'NotoSans'),  // �ؽ�Ʈ �Է� �� �۲� ����
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
