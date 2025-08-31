# Page snapshot

```yaml
- generic [ref=e4]:
  - button "Back" [ref=e6] [cursor=pointer]:
    - img [ref=e7] [cursor=pointer]
    - text: Back
  - heading "Play with friends" [level=1] [ref=e9]
  - generic [ref=e10]:
    - text: "Your account display name will be used automatically:"
    - generic [ref=e11]: Anonymous
  - generic [ref=e12]:
    - generic [ref=e13]:
      - heading "Join Game" [level=2] [ref=e14]
      - generic [ref=e15]: Room Code
      - generic [ref=e16]:
        - textbox "Room code" [ref=e17]
        - button "Join" [disabled]
      - paragraph [ref=e18]: 6 letters/numbers, not case sensitive.
      - generic [ref=e19]: OR
      - generic [ref=e22]:
        - generic [ref=e23]: Paste invite link
        - textbox "Paste invite link" [ref=e24]
    - generic [ref=e25]:
      - generic [ref=e26]:
        - img [ref=e27]
        - heading "Host Game" [level=2] [ref=e32]
      - paragraph [ref=e33]: Create a new room and share the code with friends. Up to 8 players.
      - button "Create room" [ref=e34] [cursor=pointer]
  - generic [ref=e35]: Rooms support up to 8 players. Share the 6-character code with friends.
```