require('dotenv').config();
const express = require('express');
const router = express.Router();
const { SessionsClient } = require('@google-cloud/dialogflow');  // @google-cloud/dialogflow SessionsClient
const path = require('path');

// 인증 파일 경로를 keyFilename으로 설정
const sessionClient = new SessionsClient({
    keyFilename: 'E:\\3\\nods\\newagent-dqie-e62c103ae2aa.json'  // 인증 파일 경로를 절대경로로 설정
});

// .env에서 환경 변수 로드
const projectId = 'newagent-dqie';
const sessionId = 'my-static-session';
const languageCode = 'ko';

// 세션 경로 생성 (projectAgentSessionPath 사용)
const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
console.log(projectId, sessionId, languageCode);  // 로깅 확인

// Text Query Route
router.post('/textQuery', async (req, res) => {
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: req.body.text,  // body-parser로 받은 텍스트
                languageCode: languageCode,
            },
        },
    };

    try {
        const responses = await sessionClient.detectIntent(request);  // Dialogflow API 호출
        console.log('Detected intent');
        const result = responses[0].queryResult;
        console.log(`Query: ${result.queryText}`);
        console.log(`Response: ${result.fulfillmentText}`);

        res.send(result);  // 응답 전송
    } catch (error) {
        console.error('Error detecting intent:', error);
        res.status(500).send('Error detecting intent');
    }
});

// Event Query Route
router.post('/eventQuery', async (req, res) => {
    const request = {
        session: sessionPath,
        queryInput: {
            event: {
                name: req.body.event,
                languageCode: languageCode,
            },
        },
    };

    try {
        const responses = await sessionClient.detectIntent(request);  // Dialogflow API 호출
        console.log('Detected intent');
        const result = responses[0].queryResult;
        console.log(`Query: ${result.queryText}`);
        console.log(`Response: ${result.fulfillmentText}`);

        res.send(result);  // 응답 전송
    } catch (error) {
        console.error('Error detecting intent:', error);
        res.status(500).send('Error detecting intent');
    }
});

// 새로 추가된 /api/chat 경로
router.post('/chat', async (req, res) => {
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: req.body.message,  // 요청에서 메시지를 받음
                languageCode: languageCode,
            },
        },
    };

    try {
        const responses = await sessionClient.detectIntent(request);
        const result = responses[0].queryResult;
        res.json({ response: result.fulfillmentText });  // 응답 반환
    } catch (error) {
        console.error('Error detecting intent:', error);  // 에러 로깅
        res.status(500).send('Error detecting intent');
    }
});

module.exports = router;
