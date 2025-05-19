import React from 'react'
import styles from './ToolBar.module.scss'
import Button from '../atoms/Button/Button'
import { Menu, Pen, Eraser, MoveLeft } from 'lucide-react'

const ToolBar = () => {
  return (
    <div className={styles.tb_cover}>

        <div className={styles.tb_menu}>
            <Button Icon={Menu}/>
        </div>

        <div className={styles.tb_tools}>
            <Button Icon={Pen}/>
            <Button Icon={Eraser}/>
        </div>

        <div className={styles.tb_details}>
            <Button Icon={MoveLeft}/>
        </div>
      
    </div>
  )
}

export default ToolBar
