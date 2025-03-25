import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() {
  runApp(ChatApp());
}

class ChatApp extends StatelessWidget {
  const ChatApp({super.key});

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
  const ChatScreen({super.key});

  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  List<Map<String, String>> messages = [];
  List newsArticles = [];
  final String userId = "user123"; // 사용자 ID
  bool isLoading = false; // 뉴스 로딩 상태 표시용
  @override
  void initState() {
    super.initState();
    _fetchNews(); // 뉴스 데이터 가져오기
  }

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
      isLoading = true; // 로딩 시작
    });

    try {
      final response = await http.get(Uri.parse('http://localhost:3000/api/news'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          if (data is Map<String, dynamic> && data.containsKey('items') && data['items'] is List) {
            newsArticles = data['items'].take(5).toList(); // 5개만 가져오기
          } else {
            newsArticles = [];
          }
        });
      } else {
        throw Exception('뉴스 가져오기 실패');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('뉴스 가져오기 중 오류 발생: $e')),
        );
      }
    } finally {
      setState(() {
        isLoading = false; // 로딩 완료
      });
    }
  }


  Future<void> _fetchLearningProgress() async {
    try {
      final response = await http.get(Uri.parse('http://localhost:3000/api/progress/$userId'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('학습 진행도: ${data['completedLessons']}/${data['totalLessons']}')),
          );
        }
      } else {
        throw Exception('학습 진행도 가져오기 실패');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('학습 진행도 가져오기 중 오류 발생: $e')),
        );
      }
    }
  }

  Future<void> _fetchLearningExample(String topic) async {
    try {
      final response = await http.get(Uri.parse('http://localhost:3000/api/examples/$topic'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('예시: ${data['examples'].join(', ')}')),
          );
        }
      } else {
        throw Exception('학습 예시 가져오기 실패');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('학습 예시 가져오기 중 오류 발생: $e')),
        );
      }
    }
  }

  Future<void> _saveLearningProgress(int total, int completed) async {
    try {
      final response = await http.post(
        Uri.parse('http://localhost:3000/api/progress/$userId'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'totalLessons': total,
          'completedLessons': completed,
          'incompleteLessons': total - completed
        }),
      );
      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('학습 진행도 저장 완료')),
          );
        }
      } else {
        throw Exception('학습 진행도 저장 실패');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('학습 진행도 저장 중 오류 발생: $e')),
        );
      }
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
        ],
      ),
    );
  }
}

class LearningScreen extends StatelessWidget {
  const LearningScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("학습 진행")),
      body: Center(child: Text("학습 내용")),
    );
  }
}

class QuizScreen extends StatelessWidget {
  const QuizScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("퀴즈 진행")),
      body: Center(child: Text("퀴즈 내용")),
    );
  }
}

class ITArticlesScreen extends StatelessWidget {
  const ITArticlesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("IT 기사")),
      body: Center(child: Text("IT 기사 내용")),
    );
  }
}

class CommunityScreen extends StatelessWidget {
  const CommunityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("커뮤니티")),
      body: Center(child: Text("커뮤니티 내용")),
    );
  }
}
