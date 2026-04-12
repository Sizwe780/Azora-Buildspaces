const fs = require('fs');

['components/design-studio/DesignToCode.tsx', 'components/design-studio/VersionHistory.tsx'].forEach(file => {
  if (fs.existsSync(file)) {
    let txt = fs.readFileSync(file, 'utf8');
    txt = txt.replace(/\\\/g, '\');
    txt = txt.replace(/\\\$/g, '\$');
    fs.writeFileSync(file, txt);
  }
});
