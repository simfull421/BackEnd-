import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
class CompilerScreen extends StatefulWidget {
  const CompilerScreen({super.key});

  @override
  _CompilerScreenState createState() => _CompilerScreenState();
}
class _CompilerScreenState extends State<CompilerScreen> {
  String output = '실행 결과가 여기에 표시됩니다...';
  TextEditingController _codeController = TextEditingController();
  bool isLoading = false;

  // API 호출 함수
  Future<void> _runCode() async {
    final code = _codeController.text;
    if (code.isEmpty) return;

    setState(() {
      isLoading = true;
    });

    try {
      final response = await http.post(
        Uri.parse('http://localhost:3000/run-code'), // 서버의 코드 실행 API
        headers: {'Content-Type': 'application/json'},
        body: json.encode({"code": code}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          output = data['output'] ?? '출력 없음';
        });
      } else {
        setState(() {
          output = '실행 오류';
        });
      }
    } catch (e) {
      setState(() {
        output = '서버 연결 실패: $e';
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
      appBar: AppBar(title: Text('컴파일러 실행 결과')),
      body: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '입력된 코드:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            // 코드 입력 영역
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: TextField(
                controller: _codeController,
                decoration: InputDecoration(
                  labelText: 'JavaScript 코드 입력',
                  border: OutlineInputBorder(),
                ),
                maxLines: 4,
              ),
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: _runCode,
              child: isLoading
                  ? CircularProgressIndicator()  // 로딩 중 표시
                  : Text('코드 실행'),
            ),
            SizedBox(height: 20),
            Text(
              '실행 결과:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Text(
                output,
                style: TextStyle(fontSize: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}