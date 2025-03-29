"use client"
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import Joystick from './Joystick'

type SensorControlProps = {
    isConnected: boolean
    isIdentified: boolean
    motorADirection: 'forward' | 'backward' | 'stop'
    motorBDirection: 'forward' | 'backward' | 'stop'
    motorASpeed: number
    motorBSpeed: number
    handleMotorAControl: (value: number) => void
    handleMotorBControl: (value: number) => void
}

const SensorControl = ({
                           isConnected,
                           isIdentified,
                           motorADirection,
                           motorBDirection,
                           motorASpeed,
                           motorBSpeed,
                           handleMotorAControl,
                           handleMotorBControl
                       }: SensorControlProps) => {
    const [controlVisible, setControlVisible] = useState(false)
    const [isLandscape, setIsLandscape] = useState(false)

    useEffect(() => {
        const checkOrientation = () => {
            setIsLandscape(window.innerWidth > window.innerHeight)
        }

        checkOrientation()
        window.addEventListener('resize', checkOrientation)
        return () => window.removeEventListener('resize', checkOrientation)
    }, [])

    return (
        <Dialog open={controlVisible} onOpenChange={setControlVisible}>
            <DialogTrigger asChild>
                <Button
                    onClick={() => setControlVisible(!controlVisible)}
                    disabled={!isConnected || !isIdentified}
                >
                    {controlVisible ? "Hide Controls" : "Show Controls"}
                </Button>
            </DialogTrigger>
            <DialogContent style={{
                width: '100%',
                height: '80vh',
                padding: 0,
                margin: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'stretch',
                gap: 0
            }}>
                <DialogHeader>
                    <DialogTitle></DialogTitle>
                </DialogHeader>

                <DialogClose className="absolute left-1/2 -translate-x-1/2">
                    X
                </DialogClose>

                <div className="flex w-full justify-between">
                    <div className="w-[calc(50%-10px)] h-[50%] mt-[12%] landscape:h-[70%]">
                        <Joystick
                            motor="A"
                            onChange={handleMotorAControl}
                            direction={motorADirection}
                            speed={motorASpeed}
                        />
                    </div>

                    <div className="w-[calc(50%-10px)] h-[50%] mt-[12%] landscape:h-[70%]">
                        <Joystick
                            motor="B"
                            onChange={handleMotorBControl}
                            direction={motorBDirection}
                            speed={motorBSpeed}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default SensorControl