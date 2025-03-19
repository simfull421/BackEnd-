import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() {
  runApp(ChatApp());
}

class ChatApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: ChatScreen(),
      routes: {
        '/learning': (context) => LearningScreen(),
        '/quiz': (context) => QuizScreen(),
        '/it-articles': (context) => ITArticlesScreen(),
        '/community': (context) => CommunityScreen(),
      },
    );
  }
}

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  List<Map<String, String>> messages = [];
  List newsArticles = [];  // ���� �����͸� ������ ����

  // ���� �����͸� �������� �Լ�
  Future<void> _fetchNews() async {
    final response = await http.get(Uri.parse('http://localhost:3000/api/news'));  // �鿣�� API ��û

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      setState(() {
        newsArticles = data['items'];  // 'items'�� ���� ������ �������
      });
    } else {
      setState(() {
        newsArticles = [];  // ���� �� �� ����Ʈ�� �ʱ�ȭ
      });
    }
  }

  // ���൵ �����͸� �������� API ȣ�� (����)
  Future<double> _fetchLearningProgress() async {
    final response = await http.get(Uri.parse('http://localhost:3000/api/progress'));  // �鿣�� API ��û

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['progress'];  // 'progress'�� ���൵ ���� �������
    } else {
      return 0.0;  // ���� �� 0%�� �ʱ�ȭ
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('AI ê��')),
      body: Column(
        children: [
          // ���� ��ư
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: ElevatedButton(
              onPressed: _fetchNews,
              child: Text('���� ��������'),
            ),
          ),

          // �н� ���൵ Ȯ�� ��ư
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: ElevatedButton(
              onPressed: () async {
                double progress = await _fetchLearningProgress();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('���� �н� ���൵: $progress%')),
                );
              },
              child: Text('�н� ���൵ Ȯ��'),
            ),
          ),

          // �޽����� ���� ǥ��
          Expanded(
            child: ListView.builder(
              itemCount: messages.length + newsArticles.length,  // �޽��� + ���� ��� ��
              itemBuilder: (context, index) {
                if (index < messages.length) {
                  // �޽���
                  return ListTile(
                    title: Text(
                      messages[index]['message']!,
                      style: TextStyle(
                        fontFamily: 'NotoSans',  // NotoSans �۲� ����
                        color: messages[index]['who'] == 'user' ? Colors.blue : Colors.green,
                      ),
                    ),
                  );
                } else {
                  // ���� ���
                  final article = newsArticles[index - messages.length];
                  return Card(
                    margin: EdgeInsets.all(8.0),
                    elevation: 4.0,
                    child: ListTile(
                      contentPadding: EdgeInsets.all(16.0),
                      title: Text(
                        article['title'],
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Text(
                        article['description'] ?? '������ �����ϴ�.',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: () {
                        // Ŭ�� �� ���� ���� ��ũ�� �̵� (���� URL�� ���� ���)
                        final url = article['url'];
                        if (url != null) {
                          // ��ũ ���� ���� �߰� ����
                          print('���� ���� ��ũ: $url');
                        }
                      },
                    ),
                  );
                }
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
                  onPressed: () {
                    String text = _controller.text;
                    if (text.isNotEmpty) {
                      setState(() {
                        messages.add({'who': 'user', 'message': text});
                      });
                      _controller.clear();
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class LearningScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("�н� ȭ��")),
      body: Column(
        children: [
          ElevatedButton(
            onPressed: () {
              Navigator.pushNamed(context, '/quiz');  // ���� �������� �����̷���
            },
            child: Text("�н� ���� Ǯ��"),
          ),
          ElevatedButton(
            onPressed: () {
              // �н� ���� �������� ����
              print("�н� ���� �����ֱ�");
            },
            child: Text("�н� ���� ����"),
          ),
        ],
      ),
    );
  }
}

class QuizScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("���� ȭ��")),
      body: Center(child: Text("���⿡ ���� ������ ǥ�õ˴ϴ�.")),
    );
  }
}

class ITArticlesScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("IT ��� ȭ��")),
      body: Center(child: Text("���⿡ IT ��簡 ǥ�õ˴ϴ�.")),
    );
  }
}

class CommunityScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Ŀ�´�Ƽ ȭ��")),
      body: Center(child: Text("���⿡ Ŀ�´�Ƽ ������ ǥ�õ˴ϴ�.")),
    );
  }
}
