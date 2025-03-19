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
  List newsArticles = [];  // 뉴스 데이터를 저장할 변수

  // 뉴스 데이터를 가져오는 함수
  Future<void> _fetchNews() async {
    final response = await http.get(Uri.parse('http://localhost:3000/api/news'));  // 백엔드 API 요청

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      setState(() {
        newsArticles = data['items'];  // 'items'에 뉴스 정보가 들어있음
      });
    } else {
      setState(() {
        newsArticles = [];  // 실패 시 빈 리스트로 초기화
      });
    }
  }

  // 진행도 데이터를 가져오는 API 호출 (예시)
  Future<double> _fetchLearningProgress() async {
    final response = await http.get(Uri.parse('http://localhost:3000/api/progress'));  // 백엔드 API 요청

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['progress'];  // 'progress'에 진행도 값이 들어있음
    } else {
      return 0.0;  // 실패 시 0%로 초기화
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('AI 챗봇')),
      body: Column(
        children: [
          // 뉴스 버튼
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: ElevatedButton(
              onPressed: _fetchNews,
              child: Text('뉴스 가져오기'),
            ),
          ),

          // 학습 진행도 확인 버튼
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: ElevatedButton(
              onPressed: () async {
                double progress = await _fetchLearningProgress();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('현재 학습 진행도: $progress%')),
                );
              },
              child: Text('학습 진행도 확인'),
            ),
          ),

          // 메시지와 뉴스 표시
          Expanded(
            child: ListView.builder(
              itemCount: messages.length + newsArticles.length,  // 메시지 + 뉴스 기사 수
              itemBuilder: (context, index) {
                if (index < messages.length) {
                  // 메시지
                  return ListTile(
                    title: Text(
                      messages[index]['message']!,
                      style: TextStyle(
                        fontFamily: 'NotoSans',  // NotoSans 글꼴 적용
                        color: messages[index]['who'] == 'user' ? Colors.blue : Colors.green,
                      ),
                    ),
                  );
                } else {
                  // 뉴스 기사
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
                        article['description'] ?? '설명이 없습니다.',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: () {
                        // 클릭 시 뉴스 원문 링크로 이동 (원문 URL이 있을 경우)
                        final url = article['url'];
                        if (url != null) {
                          // 링크 열기 로직 추가 가능
                          print('뉴스 원문 링크: $url');
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
                    decoration: InputDecoration(labelText: '메시지를 입력하세요'),
                    style: TextStyle(fontFamily: 'NotoSans'),  // 텍스트 입력 시 글꼴 적용
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
      appBar: AppBar(title: Text("학습 화면")),
      body: Column(
        children: [
          ElevatedButton(
            onPressed: () {
              Navigator.pushNamed(context, '/quiz');  // 퀴즈 페이지로 리다이렉션
            },
            child: Text("학습 퀴즈 풀기"),
          ),
          ElevatedButton(
            onPressed: () {
              // 학습 예제 가져오기 로직
              print("학습 예제 보여주기");
            },
            child: Text("학습 예제 보기"),
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
      appBar: AppBar(title: Text("퀴즈 화면")),
      body: Center(child: Text("여기에 퀴즈 내용이 표시됩니다.")),
    );
  }
}

class ITArticlesScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("IT 기사 화면")),
      body: Center(child: Text("여기에 IT 기사가 표시됩니다.")),
    );
  }
}

class CommunityScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("커뮤니티 화면")),
      body: Center(child: Text("여기에 커뮤니티 내용이 표시됩니다.")),
    );
  }
}
