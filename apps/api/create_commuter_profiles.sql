INSERT INTO CommuterProfile (id, userId, points)
SELECT lower(hex(randomblob(16))), u.id, 0
FROM User u
LEFT JOIN CommuterProfile c ON u.id = c.userId
WHERE u.role = 'COMMUTER' AND c.userId IS NULL;
