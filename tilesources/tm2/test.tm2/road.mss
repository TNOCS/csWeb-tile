#road [ avgVwrk = -1] [zoom > 11] {
 ::case {
   line-width: 5;
   line-color:#C2C2C2 ;
 }
 ::fill {
   line-width: 2.5;
   line-color:#E3E3E3 ;
 }
}

#road [ avgVwrk > -1] {
 ::case {
   line-width: 5;
   line-color:#7AAEBF ;
 }
 ::fill {
   line-width: 2.5;
   line-color:#9EE1F7 ;
 }
}

#road [ avgVwrk > 10] {
 ::case {
   line-width: 5;
   line-color:#7ABF84 ;
 }
 ::fill {
   line-width: 2.5;
   line-color:#9CF7A8 ;
 }
}

#road [ avgVwrk > 20] {
 ::case {
   line-width: 5;
   line-color:#BDAF77 ;
 }
 ::fill {
   line-width: 2.5;
   line-color:#F7E59C ;
 }
}

#road [ avgVwrk > 30] {
 ::case {
   line-width: 5;
   line-color:#BD7777 ;
 }
 ::fill {
   line-width: 2.5;
   line-color:#FC9F9F ;
 }
}
