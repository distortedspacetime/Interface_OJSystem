const express = require('express');
const router = express.Router();

// GET /api/groups - 그룹 목록 조회
router.get('/groups', (req, res) => {
    const mockGroups = [
        { groupId: 1, name: "알고리즘 기초 스터디" },
        { groupId: 2, name: "백엔드 실전 프로젝트" }
    ];
    res.json({ groups: mockGroups });
});

module.exports = router;