import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'compiler_screen.dart'; // compiler_screen.dart 파일 추가

void main() {
  runApp(ChatApp());
}

class ChatApp extends StatelessWidget {
  const ChatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: ChatScreen(),
    );
  }
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  List<Map<String, String>> messages = [];
  bool isLoading = false;
  List<Map<String, dynamic>> newsArticles = [];

  Future<void> _sendMessage() async {
    if (_controller.text.isEmpty) return;
    setState(() {
      messages.add({"user": _controller.text});
    });
    try {
      final response = await http.post(
        Uri.parse('http://localhost:3000/chat'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({"message": _controller.text}),
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          messages.add({"bot": data['response']});
        });
      }
    } catch (e) {
      setState(() {
        messages.add({"bot": "오류 발생: $e"});
      });
    }
    _controller.clear();
  }

  Future<void> _fetchNews() async {
    setState(() {
      isLoading = true;
    });
    try {
      final response = await http.get(Uri.parse('http://localhost:3000/api/news'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          // 뉴스 기사를 5개로 제한
          newsArticles = List<Map<String, dynamic>>.from(data['articles']).take(5).toList();
        });
      } else {
        setState(() {
          newsArticles = [];
        });
      }
    } catch (e) {
      setState(() {
        newsArticles = [];
      });
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('AI 챗')),
      body: Column(
        children: [
          // 메시지 리스트 표시
          Expanded(
            child: ListView.builder(
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final msg = messages[index];
                final isUser = msg.containsKey("user");
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: EdgeInsets.symmetric(vertical: 5, horizontal: 10),
                    padding: EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isUser ? Colors.blue : Colors.grey,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      isUser ? msg["user"]! : msg["bot"]!,
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                );
              },
            ),
          ),

          // 텍스트 입력 영역
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      labelText: '메시지를 입력하세요',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.send),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          ),

          // 뉴스 가져오기 버튼 추가
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: ElevatedButton(
              onPressed: _fetchNews,
              child: Text('뉴스 가져오기'),
            ),
          ),

          // 뉴스 로딩 중일 때 로딩 표시
          if (isLoading)
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: CircularProgressIndicator(),
            ),

          // 뉴스 리스트 표시
          if (!isLoading && newsArticles.isNotEmpty)
            Expanded(
              child: ListView.builder(
                itemCount: newsArticles.length,
                itemBuilder: (context, index) {
                  final article = newsArticles[index];
                  final imageUrl = article['imageUrl']; // 이미지 URL 가져오기 (API에서 제공하는 경우)
                  return ListTile(
                    leading: imageUrl != null
                        ? Image.network(imageUrl, width: 50, height: 50, fit: BoxFit.cover)
                        : null, // 이미지가 있을 경우 보여주기
                    title: Text(article['title'] ?? '제목 없음'),
                    subtitle: Text(article['description'] ?? '설명 없음'),
                  );
                },
              ),
            ),

          // 뉴스가 없을 경우 메시지 표시
          if (!isLoading && newsArticles.isEmpty)
            Center(child: Text('뉴스가 없습니다')),

          // 컴파일러 실행 버튼 클릭 시 새로운 창으로 이동
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: ElevatedButton(
              onPressed: () {
                // 컴파일러 실행 화면으로 이동
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => CompilerScreen(),
                  ),
                );
              },
              child: Text('컴파일러 실행'),
            ),
          ),
        ],
      ),
    );
  }
}
