# Page snapshot

```yaml
- generic [ref=e4]:
  - button "Back" [ref=e6] [cursor=pointer]:
    - img [ref=e7] [cursor=pointer]
    - text: Back
  - heading "Play with friends" [level=1] [ref=e10]
  - generic [ref=e11]:
    - text: "Your account display name will be used automatically:"
    - generic [ref=e12]: Anonymous
  - generic [ref=e13]:
    - generic [ref=e14]:
      - heading "Join Game" [level=2] [ref=e15]
      - generic [ref=e16]: Room Code
      - generic [ref=e17]:
        - textbox "Room code" [ref=e18]
        - button "Join" [disabled]
      - paragraph [ref=e19]: 6 letters/numbers, not case sensitive.
      - generic [ref=e20]: OR
      - generic [ref=e23]:
        - generic [ref=e24]: Paste invite link
        - textbox "Paste invite link" [ref=e25]
    - generic [ref=e26]:
      - generic [ref=e27]:
        - img [ref=e28]
        - heading "Host Game" [level=2] [ref=e33]
      - paragraph [ref=e34]: Create a new room and share the code with friends. Up to 8 players.
      - button "Create room" [ref=e35] [cursor=pointer]
  - generic [ref=e36]: Rooms support up to 8 players. Share the 6-character code with friends.
```